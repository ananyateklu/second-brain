import { Page, expect } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Page object for the Chat page.
 */
export class ChatPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Locators - Sidebar
  get conversationsList() {
    return this.page.locator('[data-testid="conversations-list"], .conversations-list');
  }

  get conversationItems() {
    return this.page.locator('[data-testid="conversation-item"], .conversation-item');
  }

  get newConversationButton() {
    // The new chat button uses title="New Chat" and is an icon-only button
    return this.page.locator('button[title="New Chat"], button:has-text("New Chat"), [data-testid="new-conversation"]').first();
  }

  // Locators - Chat area
  get messagesList() {
    return this.page.locator('[data-testid="messages-list"], .messages-list');
  }

  get userMessages() {
    // User messages use flex justify-end and have a specific background style
    return this.page.locator('.flex.justify-end > div[class*="rounded-2xl"]');
  }

  get assistantMessages() {
    // Assistant messages use flex justify-start
    return this.page.locator('.flex.justify-start > div[class*="rounded-2xl"]');
  }

  get messageInput() {
    // Chat input textarea has placeholder "Type a message..."
    return this.page.locator('textarea[placeholder*="Type a message"]');
  }

  get sendButton() {
    // Send button has title="Send message" and is 40x40 rounded
    // Use specific class combo to avoid matching other round buttons
    return this.page.locator('button[title="Send message"], button[title="Sending..."], button.w-10.h-10.rounded-full').first();
  }

  get loadingIndicator() {
    return this.page.locator('[data-testid="loading"], .loading-indicator, .typing-indicator');
  }

  // RAG and Agent toggles
  get ragToggle() {
    return this.page.locator('[data-testid="rag-toggle"], button:has-text("RAG"), label:has-text("RAG")');
  }

  get agentToggle() {
    return this.page.locator('[data-testid="agent-toggle"], button:has-text("Agent"), label:has-text("Agent")');
  }

  // Provider/Model selection
  get providerSelect() {
    return this.page.locator('[data-testid="provider-select"], select[name="provider"]');
  }

  get modelSelect() {
    return this.page.locator('[data-testid="model-select"], select[name="model"]');
  }

  // Agent-specific elements
  get thinkingSteps() {
    return this.page.locator('[data-testid="thinking-step"], .thinking-step');
  }

  get toolCalls() {
    return this.page.locator('[data-testid="tool-call"], .tool-call');
  }

  get retrievedNotes() {
    return this.page.locator('[data-testid="retrieved-notes"], .retrieved-notes');
  }

  // Streaming indicator
  get streamingIndicator() {
    return this.page.locator('[data-testid="streaming"], .streaming-indicator');
  }

  // Actions
  async goto() {
    await super.goto('/chat');
  }

  async startNewConversation() {
    // Check if we're already in new chat state (message input is visible and empty)
    const isReadyToChat = await this.messageInput.isVisible().catch(() => false);
    if (isReadyToChat) {
      // Already ready to start a new conversation
      return;
    }

    // Click new chat button if needed
    try {
      await this.newConversationButton.click({ timeout: 5000 });
      await this.waitForPageLoad();
    } catch {
      // Button might not be visible, but we can still send messages
      console.log('New chat button not found, proceeding with current state');
    }
  }

  async selectConversation(title: string) {
    const conversation = this.conversationItems.filter({ hasText: title });
    await conversation.click();
    await this.waitForPageLoad();
  }

  async sendMessage(message: string) {
    await this.messageInput.fill(message);
    // Trigger input event to update React state
    await this.messageInput.press('Space');
    await this.messageInput.press('Backspace');
    // Wait for animation to settle
    await this.page.waitForTimeout(1000);
    // Wait for send button to be enabled and click with force to handle animation
    await expect(this.sendButton).toBeEnabled({ timeout: 5000 });
    await this.sendButton.click({ force: true });
  }

  async sendMessageAndWaitForResponse(message: string) {
    const initialMessageCount = await this.assistantMessages.count();

    await this.sendMessage(message);

    // Wait for loading to appear
    await expect(this.loadingIndicator.or(this.streamingIndicator)).toBeVisible({ timeout: 5000 }).catch(() => {});

    // Wait for response message to appear
    await expect(this.assistantMessages).toHaveCount(initialMessageCount + 1, { timeout: 60000 });

    // Wait for streaming to complete
    await expect(this.loadingIndicator).not.toBeVisible({ timeout: 60000 }).catch(() => {});
    await expect(this.streamingIndicator).not.toBeVisible({ timeout: 60000 }).catch(() => {});
  }

  async enableRag() {
    const isEnabled = await this.ragToggle.getAttribute('data-state') === 'checked' ||
                      await this.ragToggle.getAttribute('aria-pressed') === 'true';
    if (!isEnabled) {
      await this.ragToggle.click();
    }
  }

  async disableRag() {
    const isEnabled = await this.ragToggle.getAttribute('data-state') === 'checked' ||
                      await this.ragToggle.getAttribute('aria-pressed') === 'true';
    if (isEnabled) {
      await this.ragToggle.click();
    }
  }

  async enableAgent() {
    const isEnabled = await this.agentToggle.getAttribute('data-state') === 'checked' ||
                      await this.agentToggle.getAttribute('aria-pressed') === 'true';
    if (!isEnabled) {
      await this.agentToggle.click();
    }
  }

  async selectProvider(provider: string) {
    await this.providerSelect.selectOption(provider);
  }

  async selectModel(model: string) {
    await this.modelSelect.selectOption(model);
  }

  async deleteConversation(title: string) {
    const conversation = this.conversationItems.filter({ hasText: title });
    await conversation.hover();
    const deleteButton = conversation.locator('button:has-text("Delete"), [data-testid="delete-conversation"]');
    await deleteButton.click();

    // Confirm deletion if there's a confirmation dialog
    const confirmButton = this.page.locator('button:has-text("Confirm"), button:has-text("Yes")');
    if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmButton.click();
    }
  }

  // Assertions
  async expectToBeOnChatPage() {
    await expect(this.page).toHaveURL(/\/chat/);
  }

  async expectMessageToExist(text: string | RegExp) {
    await expect(this.messagesList).toContainText(text);
  }

  async expectAssistantResponse() {
    await expect(this.assistantMessages.last()).toBeVisible();
  }

  async expectThinkingStepsToBeVisible() {
    await expect(this.thinkingSteps.first()).toBeVisible();
  }

  async expectToolCallsToBeVisible() {
    await expect(this.toolCalls.first()).toBeVisible();
  }

  async expectRetrievedNotesToBeVisible() {
    await expect(this.retrievedNotes).toBeVisible();
  }

  async expectConversationsCount(count: number) {
    await expect(this.conversationItems).toHaveCount(count);
  }

  async expectMessagesCount(count: number) {
    const totalMessages = await this.userMessages.count() + await this.assistantMessages.count();
    expect(totalMessages).toBe(count);
  }
}
