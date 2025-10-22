// errorExtraction.ts
// Utility functions to extract meaningful error messages from ERPNext API responses

/**
 * Clean HTML formatting from error messages to make them readable
 */
function cleanHtmlFromErrorMessage(message: string): string {
  if (!message || typeof message !== 'string') {
    return message;
  }

  // Remove HTML tags but preserve the text content
  let cleanedMessage = message
    // Remove <strong> tags but keep the content
    .replace(/<strong>(.*?)<\/strong>/gi, '$1')
    // Remove <a> tags but keep the content
    .replace(/<a[^>]*>(.*?)<\/a>/gi, '$1')
    // Remove other common HTML tags
    .replace(/<[^>]*>/g, '')
    // Clean up extra whitespace
    .replace(/\s+/g, ' ')
    .trim();

  // Special handling for warehouse/stock error messages
  if (cleanedMessage.includes('units of') && cleanedMessage.includes('needed in') && cleanedMessage.includes('to complete this transaction')) {
    // Extract the key information from the error message
    const match = cleanedMessage.match(/(\d+(?:\.\d+)?)\s+units?\s+of\s+(.+?)\s+needed\s+in\s+(.+?)\s+to\s+complete\s+this\s+transaction/i);
    if (match) {
      const [, quantity, itemName, warehouseName] = match;
      cleanedMessage = `${quantity} units of ${itemName} needed in ${warehouseName} to complete this transaction.`;
    }
  }

  return cleanedMessage;
}

export function extractErrorMessage(result: any, defaultMessage: string = 'Operation failed'): string {
  let errorMessage = defaultMessage;

  // Try to extract the actual error message from _server_messages
  if (result._server_messages) {
    try {
      const serverMessages = JSON.parse(result._server_messages);
      if (serverMessages && serverMessages.length > 0) {
        const firstMessage = JSON.parse(serverMessages[0]);
        if (firstMessage.message) {
          errorMessage = firstMessage.message;
        }
      }
    } catch (parseError) {
      console.error('Error parsing server messages:', parseError);
      // Fallback to the original logic
      try {
        const serverMsg = JSON.parse(result._server_messages)[0];
        errorMessage = serverMsg;
      } catch (fallbackError) {
        console.error('Fallback error parsing failed:', fallbackError);
        errorMessage = defaultMessage;
      }
    }
  }

  // Clean HTML formatting from the error message
  return cleanHtmlFromErrorMessage(errorMessage);
}

export function extractErrorFromException(err: any, defaultMessage: string = 'Operation failed'): string {
  let errorMessage = defaultMessage;

  // Try to get the actual error message from the error object
  if (err?.message) {
    // If the error message is a JSON string, parse it
    if (typeof err.message === 'string' && err.message.includes('{')) {
      try {
        const parsedError = JSON.parse(err.message);
        if (parsedError.message) {
          errorMessage = parsedError.message;
        }
      } catch (parseError) {
        // If parsing fails, use the original message
        errorMessage = err.message;
      }
    } else {
      errorMessage = err.message;
    }
  }

  // Clean HTML formatting from the error message
  return cleanHtmlFromErrorMessage(errorMessage);
}
