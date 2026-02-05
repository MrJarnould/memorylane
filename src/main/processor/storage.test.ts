import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StorageService, StoredEvent } from './storage';
import * as path from 'path';
import * as fs from 'fs';

// Helper to delete directory recursively
const deleteFolderRecursive = (directoryPath: string) => {
  if (fs.existsSync(directoryPath)) {
    fs.readdirSync(directoryPath).forEach((file) => {
      const curPath = path.join(directoryPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(directoryPath);
  }
};

// Helper to create a complete StoredEvent with defaults
const createEvent = (overrides: Partial<StoredEvent> & { id: string }): StoredEvent => ({
  id: overrides.id,
  timestamp: overrides.timestamp ?? Date.now(),
  text: overrides.text ?? 'Sample text',
  summary: overrides.summary ?? 'Sample summary',
  appName: overrides.appName ?? 'TestApp',
  vector: overrides.vector ?? [0.1, 0.2, 0.3],
});

describe('StorageService', () => {
  const TEST_DB_PATH = path.join(process.cwd(), 'temp_test_lancedb');
  let storage: StorageService;

  beforeEach(async () => {
    // Clean up before each test
    deleteFolderRecursive(TEST_DB_PATH);
    storage = new StorageService(TEST_DB_PATH);
    await storage.init();
  });

  afterEach(async () => {
    await storage.close();
    deleteFolderRecursive(TEST_DB_PATH);
  });

  it('should initialize without errors', async () => {
    expect(fs.existsSync(TEST_DB_PATH)).toBe(true);
  });

  it('should add and retrieve an event with all fields', async () => {
    const event = createEvent({
      id: 'uuid-1',
      timestamp: 1234567890,
      text: 'Hello World',
      summary: 'User said hello',
      appName: 'VS Code',
      vector: [0.1, 0.2, 0.3],
    });

    await storage.addEvent(event);

    const retrieved = await storage.getEventById('uuid-1');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.text).toBe('Hello World');
    expect(retrieved?.summary).toBe('User said hello');
    expect(retrieved?.appName).toBe('VS Code');
    
    // Check vector values with closeTo for floating point comparison
    expect(retrieved?.vector).toBeDefined();
    expect(retrieved?.vector.length).toBe(3);
    expect(retrieved?.vector[0]).toBeCloseTo(0.1);
    expect(retrieved?.vector[1]).toBeCloseTo(0.2);
    expect(retrieved?.vector[2]).toBeCloseTo(0.3);
  });

  it('should handle FTS index creation silently', async () => {
    const event1 = createEvent({
      id: 'uuid-fts-1',
      timestamp: 100,
      text: 'Apple Pie',
      summary: 'Baking apple pie',
      appName: 'Safari',
    });

    await storage.addEvent(event1);
    
    // Adding a second event should use the existing table and index
    const event2 = createEvent({
      id: 'uuid-fts-2',
      timestamp: 101,
      text: 'Banana Bread',
      summary: 'Making banana bread',
      appName: 'Chrome',
    });
    
    await storage.addEvent(event2);

    const r1 = await storage.getEventById('uuid-fts-1');
    const r2 = await storage.getEventById('uuid-fts-2');
    
    expect(r1).not.toBeNull();
    expect(r2).not.toBeNull();
  });

  describe('searchVectorsWithFilters', () => {
    it('should filter results by appName (case-sensitive column)', async () => {
      // Create events with different apps but similar vectors
      const vscodeEvent = createEvent({
        id: 'vscode-1',
        timestamp: 1000,
        text: 'Writing TypeScript code',
        summary: 'Coding in editor',
        appName: 'VS Code',
        vector: [1.0, 0.0, 0.0],
      });

      const chromeEvent = createEvent({
        id: 'chrome-1',
        timestamp: 2000,
        text: 'Browsing documentation',
        summary: 'Reading docs',
        appName: 'Chrome',
        vector: [0.9, 0.1, 0.0],
      });

      const slackEvent = createEvent({
        id: 'slack-1',
        timestamp: 3000,
        text: 'Team chat message',
        summary: 'Chatting with team',
        appName: 'Slack',
        vector: [0.8, 0.2, 0.0],
      });

      await storage.addEvent(vscodeEvent);
      await storage.addEvent(chromeEvent);
      await storage.addEvent(slackEvent);

      // Search with appName filter - should only return VS Code event
      const queryVector = [1.0, 0.0, 0.0];
      const results = await storage.searchVectorsWithFilters(queryVector, 10, {
        appName: 'VS Code',
      });

      expect(results.length).toBe(1);
      expect(results[0].id).toBe('vscode-1');
      expect(results[0].appName).toBe('VS Code');
    });

    it('should filter results by time range and appName combined', async () => {
      const event1 = createEvent({
        id: 'event-1',
        timestamp: 1000,
        appName: 'VS Code',
        vector: [1.0, 0.0, 0.0],
      });

      const event2 = createEvent({
        id: 'event-2',
        timestamp: 2000,
        appName: 'VS Code',
        vector: [0.9, 0.1, 0.0],
      });

      const event3 = createEvent({
        id: 'event-3',
        timestamp: 3000,
        appName: 'Chrome',
        vector: [0.8, 0.2, 0.0],
      });

      await storage.addEvent(event1);
      await storage.addEvent(event2);
      await storage.addEvent(event3);

      // Filter by appName AND time range
      const results = await storage.searchVectorsWithFilters([1.0, 0.0, 0.0], 10, {
        appName: 'VS Code',
        startTime: 1500,
        endTime: 2500,
      });

      expect(results.length).toBe(1);
      expect(results[0].id).toBe('event-2');
    });
  });

  describe('searchFTSWithFilters', () => {
    it('should filter FTS results by appName (case-sensitive column)', async () => {
      const vscodeEvent = createEvent({
        id: 'vscode-fts-1',
        timestamp: 1000,
        text: 'TypeScript function implementation',
        summary: 'Implementing a function',
        appName: 'VS Code',
      });

      const chromeEvent = createEvent({
        id: 'chrome-fts-1',
        timestamp: 2000,
        text: 'TypeScript documentation page',
        summary: 'Reading TypeScript docs',
        appName: 'Chrome',
      });

      await storage.addEvent(vscodeEvent);
      await storage.addEvent(chromeEvent);

      // Both events contain "TypeScript", but filter should only return VS Code
      const results = await storage.searchFTSWithFilters('TypeScript', 10, {
        appName: 'VS Code',
      });

      expect(results.length).toBe(1);
      expect(results[0].id).toBe('vscode-fts-1');
      expect(results[0].appName).toBe('VS Code');
    });
  });

  describe('getEventsByTimeRange', () => {
    it('should return events with correct appName field', async () => {
      const event1 = createEvent({
        id: 'time-1',
        timestamp: 1000,
        appName: 'VS Code',
      });

      const event2 = createEvent({
        id: 'time-2',
        timestamp: 2000,
        appName: 'Chrome',
      });

      await storage.addEvent(event1);
      await storage.addEvent(event2);

      const results = await storage.getEventsByTimeRange(null, null);

      expect(results.length).toBe(2);
      
      const vsCodeResult = results.find(r => r.id === 'time-1');
      const chromeResult = results.find(r => r.id === 'time-2');
      
      expect(vsCodeResult?.appName).toBe('VS Code');
      expect(chromeResult?.appName).toBe('Chrome');
    });

    it('should filter by time range correctly', async () => {
      const event1 = createEvent({ id: 'range-1', timestamp: 1000 });
      const event2 = createEvent({ id: 'range-2', timestamp: 2000 });
      const event3 = createEvent({ id: 'range-3', timestamp: 3000 });

      await storage.addEvent(event1);
      await storage.addEvent(event2);
      await storage.addEvent(event3);

      const results = await storage.getEventsByTimeRange(1500, 2500);

      expect(results.length).toBe(1);
      expect(results[0].id).toBe('range-2');
    });
  });

  describe('countRows', () => {
    it('should return correct count of events', async () => {
      expect(await storage.countRows()).toBe(0);

      await storage.addEvent(createEvent({ id: 'count-1' }));
      expect(await storage.countRows()).toBe(1);

      await storage.addEvent(createEvent({ id: 'count-2' }));
      expect(await storage.countRows()).toBe(2);
    });
  });
});
