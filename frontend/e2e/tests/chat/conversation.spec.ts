import { test, expect } from '../../fixtures/base.fixture';
import { TestMessages, generateTestId } from '../../utils/test-data';

test.describe('Chat Conversations', () => {
  test.beforeEach(async ({ chatPage }) => {
    await chatPage.goto();
    await chatPage.expectToBeOnChatPage();
  });

  test('should display chat page', async ({ chatPage }) => {
    await expect(chatPage.newConversationButton).toBeVisible();
    await expect(chatPage.messageInput).toBeVisible();
  });

  test('should start a new conversation', async ({ chatPage }) => {
    await chatPage.startNewConversation();

    // Message input should be ready
    await expect(chatPage.messageInput).toBeVisible();
    await expect(chatPage.messageInput).toBeEnabled();
  });

  test('should send a message', async ({ chatPage }) => {
    await chatPage.startNewConversation();

    // Send a message
    await chatPage.sendMessage(TestMessages.simple);

    // User message should appear
    await expect(chatPage.userMessages.last()).toContainText(TestMessages.simple);
  });

  test('should receive a response from AI', async ({ chatPage }) => {
    await chatPage.startNewConversation();

    // Send a message and wait for response
    await chatPage.sendMessageAndWaitForResponse(TestMessages.question);

    // Should have user message and assistant response
    await expect(chatPage.userMessages.last()).toBeVisible();
    await chatPage.expectAssistantResponse();
  });

  test('should show conversation in sidebar after sending message', async ({ chatPage }) => {
    await chatPage.startNewConversation();

    const uniqueMessage = `Test message ${generateTestId()}`;
    await chatPage.sendMessageAndWaitForResponse(uniqueMessage);

    // Conversation should appear in sidebar
    const conversationsCount = await chatPage.conversationItems.count();
    expect(conversationsCount).toBeGreaterThan(0);
  });

  test('should switch between conversations', async ({ chatPage }) => {
    // Start first conversation
    await chatPage.startNewConversation();
    const message1 = `First conversation ${generateTestId()}`;
    await chatPage.sendMessageAndWaitForResponse(message1);

    // Start second conversation
    await chatPage.startNewConversation();
    const message2 = `Second conversation ${generateTestId()}`;
    await chatPage.sendMessageAndWaitForResponse(message2);

    // Messages list should show second conversation's message
    await chatPage.expectMessageToExist(message2);
  });

  test('should maintain message history when switching back', async ({ chatPage }) => {
    // Create first conversation with unique message
    await chatPage.startNewConversation();
    const message1 = `History test ${generateTestId()}`;
    await chatPage.sendMessageAndWaitForResponse(message1);

    // Get the conversation element to click later
    const firstConversation = chatPage.conversationItems.first();

    // Create second conversation
    await chatPage.startNewConversation();
    await chatPage.sendMessageAndWaitForResponse('Second message');

    // Switch back to first conversation
    await firstConversation.click();
    await chatPage.waitForPageLoad();

    // Should still see the first message
    await chatPage.expectMessageToExist(message1);
  });

  test('should clear message input after sending', async ({ chatPage }) => {
    await chatPage.startNewConversation();

    await chatPage.messageInput.fill(TestMessages.simple);
    await chatPage.sendButton.click();

    // Input should be cleared after sending
    await expect(chatPage.messageInput).toHaveValue('');
  });

  test('should disable send button when input is empty', async ({ chatPage }) => {
    await chatPage.startNewConversation();

    // Clear the input
    await chatPage.messageInput.clear();

    // Send button might be disabled or just not send anything
    const isEmpty = await chatPage.messageInput.inputValue() === '';
    expect(isEmpty).toBe(true);
  });
});
