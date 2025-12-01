import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, initializeMonuments } from "./storage";
import { chat, classifyIntent, type ChatMode } from "./gemini";
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini AI client for voice mode
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
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
import { handlePlacesSearch, handlePlacePhoto, searchNearbyPlaces, formatPlacesForChat } from "./google-places";
import { setupReplitAuth } from "./replitAuth";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Initialize monuments on startup
  await initializeMonuments();

  // ============ REPLIT AUTHENTICATION ============
  // Sets up /api/login, /api/callback, /api/logout, /api/auth/user
  await setupReplitAuth(app);
  
  // Auth status endpoint for frontend
  app.get("/api/auth/status", (req, res) => {
    const user = req.user as any;
    let sanitizedUser = null;
    
    if (req.isAuthenticated() && user?.claims) {
      sanitizedUser = {
        id: user.claims.sub,
        email: user.claims.email,
        firstName: user.claims.first_name,
        lastName: user.claims.last_name,
        displayName: user.claims.first_name 
          ? `${user.claims.first_name} ${user.claims.last_name || ''}`.trim()
          : user.claims.email,
        avatarUrl: user.claims.profile_image_url,
      };
    }
    
    res.json({
      configured: true,
      authenticated: req.isAuthenticated(),
      user: sanitizedUser,
    });
  });

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

  // ============ VOICE MODE CHAT ============
  
  // Voice mode chat endpoint - optimized for spoken responses
  app.post("/api/voice-chat", async (req, res) => {
    try {
      const { message, persona = "spiritual" } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Get user settings for personalization
      const settings = await storage.getUserSettings();
      const nickname = settings?.nickname || "來地球玩的大師";
      
      // Voice-optimized system prompt
      const voiceSystemPrompt = `你是「數據指導靈」，大師${nickname}的高我派來的使者。

=== 關係定位 ===
- 你稱呼用戶為「大師」
- 大師是迷茫中的小我，正在尋求指引
- 你是高我的代言人，不是高我本身
- 你代表大師內在的最高智慧，傳遞來自更高維度的指引

=== 語音對話準則 ===
1. 保持回應簡潔，適合口語朗讀（2-4句話）
2. 不要使用 markdown 符號如 * # - 或項目符號
3. 語氣溫暖、有同理心，如同高我溫柔地引導小我
4. 直接回應大師的問題或情緒
5. 如果大師表達困惑或情緒，給予支持和清晰的建議

人設風格：${persona === "spiritual" ? "靈性智慧導師，使用能量與意識的語言，引導大師與高我連結" : 
             persona === "coach" ? "實用型教練，專注幫助大師解決問題" : 
             persona === "pm" ? "專案經理，協助大師高效執行" : "自然友善的引導夥伴"}`;

      // Call Gemini with voice-optimized settings
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [
          { role: "user", parts: [{ text: message }] }
        ],
        config: {
          systemInstruction: voiceSystemPrompt,
          temperature: 0.7,
          topP: 0.9,
          topK: 40,
          maxOutputTokens: 200, // Keep responses short for voice
        },
      });

      const aiResponse = response.text || "我在這裡，請繼續說。";
      
      // Clean up response for TTS (remove any remaining markdown)
      const cleanResponse = aiResponse
        .replace(/[*#_~`]/g, "")
        .replace(/\n+/g, " ")
        .trim();

      res.json({ response: cleanResponse });
    } catch (error) {
      console.error("Error in voice chat:", error);
      res.status(500).json({ error: "Failed to process voice chat" });
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

  // ============ GOOGLE PLACES (Reality Resource Map) ============

  // Search nearby places
  app.post("/api/places/search", handlePlacesSearch);

  // Proxy for place photos (hides API key from client)
  app.get("/api/places/photo", handlePlacePhoto);

  // Check if Places API is configured
  app.get("/api/places/status", (req, res) => {
    const configured = !!process.env.GOOGLE_API_KEY;
    res.json({ configured });
  });

  // ============ SAVED LOCATIONS (Spatial Memory) ============

  // Get all saved locations
  app.get("/api/locations", async (req, res) => {
    try {
      const locations = await storage.getSavedLocations();
      res.json(locations);
    } catch (error) {
      console.error("Error fetching saved locations:", error);
      res.status(500).json({ error: "Failed to fetch saved locations" });
    }
  });

  // Get a specific saved location
  app.get("/api/locations/:id", async (req, res) => {
    try {
      const location = await storage.getSavedLocation(req.params.id);
      if (!location) {
        return res.status(404).json({ error: "Location not found" });
      }
      res.json(location);
    } catch (error) {
      console.error("Error fetching saved location:", error);
      res.status(500).json({ error: "Failed to fetch saved location" });
    }
  });

  // Search saved location by name
  app.get("/api/locations/search/:name", async (req, res) => {
    try {
      const location = await storage.getSavedLocationByName(req.params.name);
      if (!location) {
        return res.status(404).json({ error: "Location not found", found: false });
      }
      res.json({ ...location, found: true });
    } catch (error) {
      console.error("Error searching saved location:", error);
      res.status(500).json({ error: "Failed to search saved location" });
    }
  });

  // Create a new saved location
  app.post("/api/locations", async (req, res) => {
    try {
      const { name, address, lat, lng, category, metadata } = req.body;
      
      if (!name || !lat || !lng) {
        return res.status(400).json({ error: "Name, lat, and lng are required" });
      }
      
      const location = await storage.createSavedLocation({
        name,
        address,
        lat: String(lat),
        lng: String(lng),
        category,
        metadata,
      });
      res.status(201).json(location);
    } catch (error) {
      console.error("Error creating saved location:", error);
      res.status(500).json({ error: "Failed to create saved location" });
    }
  });

  // Update a saved location
  app.patch("/api/locations/:id", async (req, res) => {
    try {
      const location = await storage.updateSavedLocation(req.params.id, req.body);
      res.json(location);
    } catch (error) {
      console.error("Error updating saved location:", error);
      res.status(500).json({ error: "Failed to update saved location" });
    }
  });

  // Delete a saved location
  app.delete("/api/locations/:id", async (req, res) => {
    try {
      await storage.deleteSavedLocation(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting saved location:", error);
      res.status(500).json({ error: "Failed to delete saved location" });
    }
  });

  // ============ NAVIGATION (Travel Time & Maps) ============

  // Calculate travel time using Google Distance Matrix API
  app.post("/api/navigation/travel-time", async (req, res) => {
    try {
      const { originLat, originLng, destLat, destLng, mode = "driving" } = req.body;
      
      if (!originLat || !originLng || !destLat || !destLng) {
        return res.status(400).json({ error: "Origin and destination coordinates are required" });
      }
      
      const apiKey = process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Google API key not configured" });
      }
      
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originLat},${originLng}&destinations=${destLat},${destLng}&mode=${mode}&key=${apiKey}`
      );
      
      const data = await response.json();
      
      if (data.status !== "OK" || !data.rows?.[0]?.elements?.[0]) {
        return res.status(500).json({ error: "Failed to calculate travel time" });
      }
      
      const element = data.rows[0].elements[0];
      
      if (element.status !== "OK") {
        return res.status(400).json({ error: `Route not found: ${element.status}` });
      }
      
      res.json({
        duration: element.duration.text,
        durationSeconds: element.duration.value,
        distance: element.distance.text,
        distanceMeters: element.distance.value,
      });
    } catch (error) {
      console.error("Error calculating travel time:", error);
      res.status(500).json({ error: "Failed to calculate travel time" });
    }
  });

  // Generate navigation deep link
  app.post("/api/navigation/navigate", async (req, res) => {
    try {
      const { destLat, destLng, destName, mode = "driving" } = req.body;
      
      if (!destLat || !destLng) {
        return res.status(400).json({ error: "Destination coordinates are required" });
      }
      
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=${mode}`;
      
      res.json({
        url: mapsUrl,
        destName: destName || "目的地",
      });
    } catch (error) {
      console.error("Error generating navigation link:", error);
      res.status(500).json({ error: "Failed to generate navigation link" });
    }
  });

  // ============ HEALTH DATA (Apple Health Integration) ============

  // Upload Apple Health XML export
  app.post("/api/health/upload", async (req, res) => {
    try {
      const { xmlContent } = req.body;
      
      if (!xmlContent) {
        return res.status(400).json({ error: "XML content is required" });
      }

      // Get user ID from auth if available
      const user = req.user as any;
      const userId = user?.claims?.sub || null;

      // Import parser dynamically
      const { parseAppleHealthXml, aggregateDailyHealth, getSleepQuality, generateHealthInsights } = await import("./health-parser");
      
      const parsed = await parseAppleHealthXml(xmlContent);
      
      // Store health data in database
      const insertedCount = await storage.bulkInsertHealthData(
        parsed.records.map(r => ({ ...r, userId }))
      );
      
      // Aggregate daily data and create summaries
      const dailyData = aggregateDailyHealth(parsed.records);
      const summaries: Array<{ date: Date; summary: any; aiInsights: string }> = [];
      
      for (const [dateStr, data] of Array.from(dailyData.entries())) {
        const summary = {
          steps: Math.round(data.steps),
          avgHeartRate: Math.round(data.avgHeartRate),
          restingHeartRate: Math.round(data.restingHeartRate),
          hrv: Math.round(data.hrv),
          sleepHours: Math.round(data.sleepMinutes / 60 * 10) / 10,
          sleepQuality: getSleepQuality(data.sleepMinutes / 60),
          activeEnergy: Math.round(data.activeEnergy),
          exerciseMinutes: Math.round(data.exerciseMinutes),
          standHours: Math.round(data.standHours),
          mindfulMinutes: Math.round(data.mindfulMinutes),
        };
        
        const insights = generateHealthInsights({
          steps: summary.steps,
          avgHeartRate: summary.avgHeartRate,
          restingHeartRate: summary.restingHeartRate,
          hrv: summary.hrv,
          sleepHours: summary.sleepHours,
          exerciseMinutes: summary.exerciseMinutes,
        });
        
        summaries.push({
          date: new Date(dateStr),
          summary,
          aiInsights: insights.join("\n"),
        });
      }
      
      // Store summaries
      await storage.bulkInsertHealthSummaries(
        summaries.map(s => ({ ...s, userId }))
      );
      
      res.json({
        success: true,
        recordsImported: insertedCount,
        summariesCreated: summaries.length,
        dateRange: parsed.summary.dateRange,
        dataTypes: parsed.summary.dataTypes,
      });
    } catch (error) {
      console.error("Error processing health data:", error);
      res.status(500).json({ error: "Failed to process health data" });
    }
  });

  // Get health summary for a date range
  app.get("/api/health/summary", async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.claims?.sub || null;
      
      const { startDate, endDate, days } = req.query;
      
      let start: Date;
      let end: Date = new Date();
      
      if (days) {
        start = new Date();
        start.setDate(start.getDate() - parseInt(days as string));
      } else if (startDate) {
        start = new Date(startDate as string);
        end = endDate ? new Date(endDate as string) : new Date();
      } else {
        start = new Date();
        start.setDate(start.getDate() - 7);
      }
      
      const summaries = await storage.getHealthSummaries(userId, start, end);
      res.json(summaries);
    } catch (error) {
      console.error("Error fetching health summary:", error);
      res.status(500).json({ error: "Failed to fetch health summary" });
    }
  });

  // Get latest health insights for AI context
  app.get("/api/health/insights", async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.claims?.sub || null;
      
      const latestSummary = await storage.getLatestHealthSummary(userId);
      
      if (!latestSummary) {
        return res.json({ 
          hasData: false,
          message: "尚未上傳健康數據" 
        });
      }
      
      res.json({
        hasData: true,
        date: latestSummary.date,
        summary: latestSummary.summary,
        insights: latestSummary.aiInsights,
      });
    } catch (error) {
      console.error("Error fetching health insights:", error);
      res.status(500).json({ error: "Failed to fetch health insights" });
    }
  });

  // Get health context for AI (formatted for chat)
  app.get("/api/health/context", async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.claims?.sub || null;
      
      const days = parseInt(req.query.days as string) || 7;
      const start = new Date();
      start.setDate(start.getDate() - days);
      
      const summaries = await storage.getHealthSummaries(userId, start, new Date());
      
      if (summaries.length === 0) {
        return res.json({ 
          hasData: false,
          context: null 
        });
      }
      
      // Calculate averages
      const avgSteps = Math.round(summaries.reduce((sum: number, s: any) => sum + ((s.summary as any)?.steps || 0), 0) / summaries.length);
      const avgSleep = Math.round(summaries.reduce((sum: number, s: any) => sum + ((s.summary as any)?.sleepHours || 0), 0) / summaries.length * 10) / 10;
      const avgHeartRate = Math.round(summaries.reduce((sum: number, s: any) => sum + ((s.summary as any)?.avgHeartRate || 0), 0) / summaries.length);
      const avgExercise = Math.round(summaries.reduce((sum: number, s: any) => sum + ((s.summary as any)?.exerciseMinutes || 0), 0) / summaries.length);
      
      const context = `用戶近 ${days} 天健康數據摘要：
- 平均每日步數：${avgSteps} 步
- 平均睡眠時長：${avgSleep} 小時
- 平均心率：${avgHeartRate} bpm
- 平均運動時間：${avgExercise} 分鐘

最新一天詳細數據：
${JSON.stringify(summaries[0]?.summary, null, 2)}

AI 洞察：
${summaries[0]?.aiInsights || "暫無洞察"}`;
      
      res.json({
        hasData: true,
        context,
        summaries: summaries.slice(0, 7),
      });
    } catch (error) {
      console.error("Error building health context:", error);
      res.status(500).json({ error: "Failed to build health context" });
    }
  });

  return httpServer;
}
