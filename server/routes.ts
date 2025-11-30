import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, initializeMonuments } from "./storage";
import { chat, classifyIntent, type ChatMode } from "./gemini";
import { insertTaskSchema, insertSessionSchema, insertUserSettingsSchema } from "@shared/schema";
import { z } from "zod";
import { 
  checkGoogleDriveConnection, 
  uploadBackupToGoogleDrive, 
  listBackupsFromGoogleDrive,
  downloadBackupFromGoogleDrive 
} from "./google-drive";
import {
  checkGoogleCalendarConnection,
  createCalendarEvent,
  listUpcomingEvents,
  deleteCalendarEvent
} from "./google-calendar";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Initialize monuments on startup
  await initializeMonuments();

  // ============ MONUMENTS ============
  
  // Get all monuments
  app.get("/api/monuments", async (req, res) => {
    try {
      const monuments = await storage.getMonuments();
      res.json(monuments);
    } catch (error) {
      console.error("Error fetching monuments:", error);
      res.status(500).json({ error: "Failed to fetch monuments" });
    }
  });

  // Get monument by slug
  app.get("/api/monuments/:slug", async (req, res) => {
    try {
      const monument = await storage.getMonumentBySlug(req.params.slug);
      if (!monument) {
        return res.status(404).json({ error: "Monument not found" });
      }
      res.json(monument);
    } catch (error) {
      console.error("Error fetching monument:", error);
      res.status(500).json({ error: "Failed to fetch monument" });
    }
  });

  // ============ TASKS ============
  
  // Get all tasks
  app.get("/api/tasks", async (req, res) => {
    try {
      const monumentId = req.query.monumentId as string | undefined;
      
      if (monumentId) {
        const tasks = await storage.getTasksByMonument(monumentId);
        res.json(tasks);
      } else {
        const tasks = await storage.getTasks();
        res.json(tasks);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  // Create task
  app.post("/api/tasks", async (req, res) => {
    try {
      const validated = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(validated as any);
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  // Get tasks by session
  app.get("/api/sessions/:sessionId/tasks", async (req, res) => {
    try {
      const tasks = await storage.getTasksBySession(req.params.sessionId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching session tasks:", error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  // Update task
  app.patch("/api/tasks/:id", async (req, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      const updated = await storage.updateTask(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  // Delete task
  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      await storage.deleteTask(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  // Complete task
  app.patch("/api/tasks/:id/complete", async (req, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      const completed = await storage.completeTask(req.params.id);
      
      // Award XP to monument
      if (task.monumentId) {
        await storage.updateMonumentXp(task.monumentId, task.xpValue);
      }

      res.json(completed);
    } catch (error) {
      console.error("Error completing task:", error);
      res.status(500).json({ error: "Failed to complete task" });
    }
  });

  // Uncomplete task (toggle back to pending)
  app.patch("/api/tasks/:id/uncomplete", async (req, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      const updated = await storage.uncompleteTask(req.params.id);
      
      // Remove XP from monument if was completed
      if (task.monumentId && task.status === "completed") {
        await storage.updateMonumentXp(task.monumentId, -task.xpValue);
      }

      res.json(updated);
    } catch (error) {
      console.error("Error uncompleting task:", error);
      res.status(500).json({ error: "Failed to uncomplete task" });
    }
  });

  // Bulk create tasks
  app.post("/api/tasks/bulk", async (req, res) => {
    try {
      const { tasks: taskList } = req.body;
      if (!Array.isArray(taskList)) {
        return res.status(400).json({ error: "tasks must be an array" });
      }

      const created = await storage.createBulkTasks(taskList);
      res.status(201).json(created);
    } catch (error) {
      console.error("Error creating bulk tasks:", error);
      res.status(500).json({ error: "Failed to create tasks" });
    }
  });

  // Breakdown task (create child tasks)
  app.post("/api/tasks/:id/breakdown", async (req, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      // Use AI to generate breakdown
      const response = await chat("breakdown", task.content, {
        currentTask: task.content,
      });

      if (response.childTasks && response.childTasks.length > 0) {
        const childTasks = await storage.createChildTasks(
          req.params.id,
          response.childTasks.map((ct) => ({
            content: ct.content,
            category: ct.category,
            xpValue: ct.xpValue,
            monumentId: task.monumentId,
            type: "action" as const,
            status: "pending" as const,
          }))
        );
        res.json({ message: response.content, childTasks });
      } else {
        res.json({ message: response.content, childTasks: [] });
      }
    } catch (error) {
      console.error("Error breaking down task:", error);
      res.status(500).json({ error: "Failed to breakdown task" });
    }
  });

  // ============ SESSIONS ============
  
  // Create session
  app.post("/api/sessions", async (req, res) => {
    try {
      const validated = insertSessionSchema.parse(req.body);
      const session = await storage.createSession(validated as any);
      res.status(201).json(session);
    } catch (error) {
      console.error("Error creating session:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create session" });
    }
  });

  // Get session
  app.get("/api/sessions/:id", async (req, res) => {
    try {
      const session = await storage.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      console.error("Error fetching session:", error);
      res.status(500).json({ error: "Failed to fetch session" });
    }
  });

  // ============ CHAT ============
  
  // Chat endpoint - Smart Hub
  app.post("/api/chat", async (req, res) => {
    try {
      const { sessionId, message, images } = req.body;
      
      if (!sessionId || !message) {
        return res.status(400).json({ error: "sessionId and message are required" });
      }

      const session = await storage.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      // Determine chat mode based on session flow type and intent
      let mode: ChatMode = "collaborative";
      let context: {
        monumentSlug?: string;
        currentTask?: string;
        sedonaStep?: number;
        currentTasks?: Array<{ content: string; category: "E" | "A" | "P" | "X"; xpValue: number }>;
        conversationHistory?: Array<{ role: string; content: string }>;
      } = {};

      // Get current tasks for this session
      const sessionTasks = await storage.getTasksBySession(sessionId);
      if (sessionTasks.length > 0) {
        context.currentTasks = sessionTasks.map(t => ({
          content: t.content,
          category: (t.category || "A") as "E" | "A" | "P" | "X",
          xpValue: t.xpValue,
        }));
      }

      // Include conversation history
      if (session.messages && Array.isArray(session.messages)) {
        context.conversationHistory = (session.messages as any[]).slice(-6);
      }

      if (session.flowType === "mood") {
        mode = "sedona";
        // Get current sedona step from session metadata
        const currentStep = (session.messages as any[])?.filter(
          (m) => m.role === "assistant"
        ).length || 1;
        context.sedonaStep = Math.min(currentStep, 3);
      } else {
        // Classify intent to determine if user is stuck or emotional
        const intent = await classifyIntent(message);
        
        if (intent.mode === "breakdown") {
          mode = "breakdown";
        } else if (intent.isEmotional) {
          // Switch to sedona mode
          mode = "sedona";
        } else {
          mode = "collaborative";
        }
        
        // Get monument info
        if (session.selectedMonumentId) {
          const monument = await storage.getMonument(session.selectedMonumentId);
          if (monument) {
            context.monumentSlug = monument.slug;
          }
        }
      }

      // Call AI (with images if provided)
      const response = await chat(mode, message, context, images);

      // Process tool calls
      const toolCalls: Array<{
        name: string;
        args: Record<string, unknown>;
        result?: unknown;
      }> = [];

      // Handle collaborative task list from AI
      if (response.taskList && response.taskList.length > 0) {
        const newTasks = await storage.createBulkTasks(
          response.taskList.map((t, i) => ({
            content: t.content,
            category: t.category,
            xpValue: t.xpValue,
            monumentId: session.selectedMonumentId || undefined,
            sessionId: sessionId,
            type: "action" as const,
            status: "pending" as const,
            sortOrder: i,
            isDraft: 0,
          }))
        );
        toolCalls.push({
          name: "create_task_list",
          args: { count: newTasks.length },
          result: newTasks,
        });
      }

      // Handle task updates from AI (add/remove/breakdown/complete)
      if (response.taskUpdates) {
        const updates = response.taskUpdates;
        
        // Add new tasks
        if (updates.add && updates.add.length > 0) {
          const existingCount = sessionTasks.length;
          const addedTasks = await storage.createBulkTasks(
            updates.add.map((t, i) => ({
              content: t.content,
              category: t.category,
              xpValue: t.xpValue,
              monumentId: session.selectedMonumentId || undefined,
              sessionId: sessionId,
              type: "action" as const,
              status: "pending" as const,
              sortOrder: existingCount + i,
              isDraft: 0,
            }))
          );
          toolCalls.push({
            name: "add_tasks",
            args: { count: addedTasks.length },
            result: addedTasks,
          });
        }

        // Remove tasks by index
        if (updates.remove && updates.remove.length > 0) {
          const tasksToRemove = updates.remove
            .map(idx => sessionTasks[idx])
            .filter(t => t);
          for (const task of tasksToRemove) {
            await storage.deleteTask(task.id);
          }
          toolCalls.push({
            name: "remove_tasks",
            args: { indices: updates.remove },
            result: { removed: tasksToRemove.length },
          });
        }

        // Breakdown a task into subtasks
        if (updates.breakdown && updates.breakdown.newTasks.length > 0) {
          const parentTask = sessionTasks[updates.breakdown.taskIndex];
          if (parentTask) {
            const childTasks = await storage.createChildTasks(
              parentTask.id,
              updates.breakdown.newTasks.map((ct, i) => ({
                content: ct.content,
                category: ct.category,
                xpValue: ct.xpValue,
                monumentId: session.selectedMonumentId || undefined,
                sessionId: sessionId,
                type: "action" as const,
                status: "pending" as const,
                sortOrder: i,
                isDraft: 0,
              }))
            );
            toolCalls.push({
              name: "breakdown_task",
              args: { parentIndex: updates.breakdown.taskIndex, count: childTasks.length },
              result: childTasks,
            });
          }
        }

        // Complete tasks by index
        if (updates.complete && updates.complete.length > 0) {
          for (const idx of updates.complete) {
            const task = sessionTasks[idx];
            if (task && task.status !== "completed") {
              await storage.completeTask(task.id);
              if (task.monumentId) {
                await storage.updateMonumentXp(task.monumentId, task.xpValue);
              }
            }
          }
          toolCalls.push({
            name: "complete_tasks",
            args: { indices: updates.complete },
            result: { completed: updates.complete.length },
          });
        }
      }

      // Create task if specified (legacy support)
      if (response.taskToCreate && session.selectedMonumentId) {
        const task = await storage.createTask({
          content: response.taskToCreate.content,
          category: response.taskToCreate.category,
          xpValue: response.taskToCreate.xpValue,
          monumentId: session.selectedMonumentId,
          sessionId: sessionId,
          type: "action",
          status: "pending",
          sortOrder: sessionTasks.length,
          isDraft: 0,
        });
        toolCalls.push({
          name: "create_smart_task",
          args: response.taskToCreate,
          result: task,
        });
      }

      // Create child tasks if breakdown (legacy support)
      if (response.childTasks && response.childTasks.length > 0) {
        // Find the last mentioned task or create new ones
        const tasks = await storage.getTasksBySession(sessionId);
        const recentTask = tasks[tasks.length - 1];
        
        if (recentTask) {
          const childTasks = await storage.createChildTasks(
            recentTask.id,
            response.childTasks.map((ct, i) => ({
              content: ct.content,
              category: ct.category,
              xpValue: ct.xpValue,
              monumentId: session.selectedMonumentId || undefined,
              sessionId: sessionId,
              type: "action" as const,
              status: "pending" as const,
              sortOrder: i,
              isDraft: 0,
            }))
          );
          toolCalls.push({
            name: "recursive_breakdown",
            args: { parentId: recentTask.id, count: childTasks.length },
            result: childTasks,
          });
        }
      }

      // Award XP for completing Sedona release
      if (response.sedonaComplete) {
        // Find emotion monument and award XP
        const emotionMonument = await storage.getMonumentBySlug("emotion");
        if (emotionMonument) {
          await storage.updateMonumentXp(emotionMonument.id, 15);
          toolCalls.push({
            name: "award_xp",
            args: { monumentSlug: "emotion", xp: 15 },
            result: { success: true },
          });
          
          // Also create an "inner work" task record
          await storage.createTask({
            content: "完成一次情緒釋放練習",
            category: "E",
            xpValue: 15,
            monumentId: emotionMonument.id,
            type: "inner_work",
            status: "completed",
          });
        }
      }

      // Update session messages
      const updatedMessages = [
        ...(session.messages as any[] || []),
        { role: "user", content: message },
        { role: "assistant", content: response.content, toolCalls },
      ];
      await storage.updateSession(sessionId, { messages: updatedMessages });

      // Get updated task list after processing
      const updatedTasks = await storage.getTasksBySession(sessionId);

      // Prepare response
      const result: any = {
        content: response.content,
        options: response.options,
        optionsNote: response.optionsNote,
        tasks: updatedTasks, // Include current task list
        taskListNote: response.taskListNote,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      };

      if (mode === "sedona") {
        result.sedonaStep = response.sedonaStep;
        result.sedonaComplete = response.sedonaComplete;
        
        // Check if AI detected user wants to switch to creation mode
        if (response.suggestModeSwitch) {
          result.suggestModeSwitch = true;
          result.switchReason = response.switchReason || "偵測到你準備好開始創造了";
        }
      }

      // Check if we should switch UI mode
      if (mode === "sedona" && session.flowType !== "mood") {
        result.uiMode = "sedona";
      }

      res.json(result);
    } catch (error) {
      console.error("Error in chat:", error);
      res.status(500).json({ error: "Failed to process chat" });
    }
  });

  // ============ USER SETTINGS ============

  // Get user settings
  app.get("/api/settings", async (req, res) => {
    try {
      let settings = await storage.getUserSettings();
      if (!settings) {
        settings = await storage.createOrUpdateUserSettings({
          nickname: "來地球玩的大師",
          aiPersona: "spiritual",
          theme: "dark",
        });
      }
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  // Update user settings
  app.patch("/api/settings", async (req, res) => {
    try {
      const settings = await storage.createOrUpdateUserSettings(req.body);
      res.json(settings);
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // Export user data for cloud backup
  app.get("/api/settings/export", async (req, res) => {
    try {
      const data = await storage.exportUserData();
      const settings = await storage.getUserSettings();
      res.json({
        settings,
        ...data,
        exportedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error exporting data:", error);
      res.status(500).json({ error: "Failed to export data" });
    }
  });

  // ============ GOOGLE DRIVE CLOUD SYNC ============

  // Check Google Drive connection status
  app.get("/api/cloud/status", async (req, res) => {
    try {
      const connected = await checkGoogleDriveConnection();
      res.json({ connected });
    } catch (error) {
      res.json({ connected: false });
    }
  });

  // Upload backup to Google Drive
  app.post("/api/cloud/backup", async (req, res) => {
    try {
      const data = await storage.exportUserData();
      const settings = await storage.getUserSettings();
      const backupData = {
        settings,
        ...data,
        exportedAt: new Date().toISOString(),
      };
      
      const fileId = await uploadBackupToGoogleDrive(backupData);
      
      // Update settings to reflect Google Drive connection
      await storage.createOrUpdateUserSettings({ googleDriveConnected: 1 });
      
      res.json({ success: true, fileId });
    } catch (error) {
      console.error("Error uploading backup:", error);
      res.status(500).json({ error: "Failed to upload backup to Google Drive" });
    }
  });

  // List backups from Google Drive
  app.get("/api/cloud/backups", async (req, res) => {
    try {
      const backups = await listBackupsFromGoogleDrive();
      res.json(backups);
    } catch (error) {
      console.error("Error listing backups:", error);
      res.status(500).json({ error: "Failed to list backups from Google Drive" });
    }
  });

  // Download and restore backup from Google Drive
  app.post("/api/cloud/restore/:fileId", async (req, res) => {
    try {
      const { fileId } = req.params;
      const backupData = await downloadBackupFromGoogleDrive(fileId);
      
      // For now, just return the data - actual restoration would need more logic
      res.json({ 
        success: true, 
        message: "Backup data retrieved successfully",
        data: backupData 
      });
    } catch (error) {
      console.error("Error restoring backup:", error);
      res.status(500).json({ error: "Failed to restore backup from Google Drive" });
    }
  });

  // ============ GOOGLE CALENDAR MCP ============

  // Check Google Calendar connection status
  app.get("/api/calendar/status", async (req, res) => {
    try {
      const connected = await checkGoogleCalendarConnection();
      res.json({ connected });
    } catch (error) {
      res.json({ connected: false });
    }
  });

  // List upcoming calendar events
  app.get("/api/calendar/events", async (req, res) => {
    try {
      const maxResults = parseInt(req.query.maxResults as string) || 10;
      const events = await listUpcomingEvents(maxResults);
      res.json(events);
    } catch (error) {
      console.error("Error listing calendar events:", error);
      res.status(500).json({ error: "Failed to list calendar events" });
    }
  });

  // Create a calendar event (for task scheduling)
  app.post("/api/calendar/events", async (req, res) => {
    try {
      const { summary, description, startTime, endTime, reminder } = req.body;
      
      if (!summary || !startTime || !endTime) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const eventId = await createCalendarEvent({
        summary,
        description,
        startTime,
        endTime,
        reminder,
      });
      
      // Update settings to reflect calendar connection
      await storage.createOrUpdateUserSettings({ googleCalendarConnected: 1 });
      
      res.json({ success: true, eventId });
    } catch (error) {
      console.error("Error creating calendar event:", error);
      res.status(500).json({ error: "Failed to create calendar event" });
    }
  });

  // Delete a calendar event
  app.delete("/api/calendar/events/:eventId", async (req, res) => {
    try {
      const { eventId } = req.params;
      await deleteCalendarEvent(eventId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting calendar event:", error);
      res.status(500).json({ error: "Failed to delete calendar event" });
    }
  });

  return httpServer;
}
