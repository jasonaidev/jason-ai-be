import type { Schema, Attribute } from '@strapi/strapi';

export interface AssistantMessageAssistantMessage extends Schema.Component {
  collectionName: 'components_assistant_message_assistant_messages';
  info: {
    displayName: 'assistant_message';
    description: '';
  };
  attributes: {
    message: Attribute.Text;
  };
}

export interface MessageMessage extends Schema.Component {
  collectionName: 'components_message_messages';
  info: {
    displayName: 'message';
  };
  attributes: {
    user_message: Attribute.Text;
    assistant_message: Attribute.Text;
  };
}

export interface UserMessageUserMessage extends Schema.Component {
  collectionName: 'components_user_message_user_messages';
  info: {
    displayName: 'user_message';
    description: '';
  };
  attributes: {
    message: Attribute.Text;
  };
}

declare module '@strapi/types' {
  export module Shared {
    export interface Components {
      'assistant-message.assistant-message': AssistantMessageAssistantMessage;
      'message.message': MessageMessage;
      'user-message.user-message': UserMessageUserMessage;
    }
  }
}
