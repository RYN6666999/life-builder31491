import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, initializeMonuments } from "./storage";
import { chat, classifyIntent, type ChatMode } from "./gemini";
import { insertTaskSchema, insertSessionSchema } from "@shared/schema";
import { z } from "zod";

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
      const { sessionId, message } = req.body;
      
      if (!sessionId || !message) {
        return res.status(400).json({ error: "sessionId and message are required" });
      }

      const session = await storage.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      // Determine chat mode based on session flow type and intent
      let mode: ChatMode = "smart_guard";
      let context: {
        monumentSlug?: string;
        currentTask?: string;
        sedonaStep?: number;
      } = {};

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
        }
        
        // Get monument info
        if (session.selectedMonumentId) {
          const monument = await storage.getMonument(session.selectedMonumentId);
          if (monument) {
            context.monumentSlug = monument.slug;
          }
        }
      }

      // Call AI
      const response = await chat(mode, message, context);

      // Process tool calls
      const toolCalls: Array<{
        name: string;
        args: Record<string, unknown>;
        result?: unknown;
      }> = [];

      // Create task if specified
      if (response.taskToCreate && session.selectedMonumentId) {
        const task = await storage.createTask({
          content: response.taskToCreate.content,
          category: response.taskToCreate.category,
          xpValue: response.taskToCreate.xpValue,
          monumentId: session.selectedMonumentId,
          type: "action",
          status: "pending",
        });
        toolCalls.push({
          name: "create_smart_task",
          args: response.taskToCreate,
          result: task,
        });
      }

      // Create child tasks if breakdown
      if (response.childTasks && response.childTasks.length > 0) {
        // Find the last mentioned task or create new ones
        const tasks = await storage.getTasks();
        const recentTask = tasks[tasks.length - 1];
        
        if (recentTask) {
          const childTasks = await storage.createChildTasks(
            recentTask.id,
            response.childTasks.map((ct) => ({
              content: ct.content,
              category: ct.category,
              xpValue: ct.xpValue,
              monumentId: session.selectedMonumentId || undefined,
              type: "action" as const,
              status: "pending" as const,
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

      // Prepare response
      const result: any = {
        content: response.content,
        options: response.options,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      };

      if (mode === "sedona") {
        result.sedonaStep = response.sedonaStep;
        result.sedonaComplete = response.sedonaComplete;
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

  return httpServer;
}
