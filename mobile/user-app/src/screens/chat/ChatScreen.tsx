// mobile/user-app/src/screens/chat/ChatScreen.tsx
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { spacing, borderRadius, type ColorPalette } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

export function ChatScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: '1',
      role: 'assistant',
      content: t('chat.initialMessage'),
      timestamp: new Date(),
      suggestions: [
        t('chat.suggestions.aboutSwami'),
        t('chat.suggestions.upcomingEvents'),
        t('chat.suggestions.booksTeachings'),
        t('chat.suggestions.visitAshram'),
      ],
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sessionId] = useState(() => `mobile_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);
  const flatListRef = useRef<FlatList>(null);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  useEffect(() => {
    scrollToEnd();
  }, [messages, scrollToEnd]);

  const sendMessage = async (text?: string) => {
    const messageText = (text || inputText).trim();
    if (!messageText || isTyping) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      const response = await api.post('/chat-bot/message', {
        message: messageText,
        conversationId,
        sessionId,
      });

      // api interceptor unwraps { success, data } -> data
      const data = response.data;

      if (data.conversationId) {
        setConversationId(data.conversationId);
      }

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(),
        suggestions: data.suggestions,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error('Chat error:', err);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: t('chat.errorMessage'),
        timestamp: new Date(),
        suggestions: [t('chat.suggestions.aboutSwami'), t('chat.suggestions.upcomingEvents')],
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <View style={[styles.messageRow, item.role === 'user' ? styles.userRow : styles.botRow]}>
      {item.role === 'assistant' && (
        <View style={styles.botAvatar}>
          <Icon name="om" size={16} color={colors.primary.maroon} />
        </View>
      )}
      <View
        style={[
          styles.messageBubble,
          item.role === 'user' ? styles.userBubble : styles.botBubble,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            item.role === 'user' ? styles.userText : styles.botText,
          ]}
        >
          {item.content}
        </Text>
        <Text
          style={[
            styles.timestamp,
            item.role === 'user' ? styles.userTimestamp : styles.botTimestamp,
          ]}
        >
          {new Date(item.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
      {item.role === 'assistant' && item.suggestions && (
        <View style={styles.suggestionsContainer}>
          {item.suggestions.map((s) => (
            <TouchableOpacity
              key={s}
              style={styles.suggestionPill}
              onPress={() => sendMessage(s)}
            >
              <Text style={styles.suggestionText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerAvatar}>
          <Icon name="om" size={20} color="#fff" />
        </View>
        <View>
          <Text style={styles.headerTitle}>{t('chat.headerTitle')}</Text>
          <Text style={styles.headerSubtitle}>{t('chat.headerSubtitle')}</Text>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={scrollToEnd}
      />

      {/* Typing Indicator */}
      {isTyping && (
        <View style={styles.typingContainer}>
          <ActivityIndicator size="small" color={colors.primary.maroon} />
          <Text style={styles.typingText}>{t('chat.typing')}</Text>
        </View>
      )}

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder={t('chat.inputPlaceholder')}
          placeholderTextColor={colors.text.secondary}
          returnKeyType="send"
          onSubmitEditing={() => sendMessage()}
          editable={!isTyping}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || isTyping) && styles.sendButtonDisabled]}
          onPress={() => sendMessage()}
          disabled={!inputText.trim() || isTyping}
        >
          <Icon name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.warmWhite,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    paddingTop: spacing.xl,
    backgroundColor: colors.primary.maroon,
    gap: spacing.sm,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  messagesList: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  messageRow: {
    marginBottom: spacing.md,
  },
  userRow: {
    alignItems: 'flex-end',
  },
  botRow: {
    alignItems: 'flex-start',
  },
  botAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.background.parchment,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: borderRadius.lg,
    padding: spacing.sm + 2,
  },
  userBubble: {
    backgroundColor: colors.primary.maroon,
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: colors.background.parchment,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(128,0,32,0.1)',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: '#fff',
  },
  botText: {
    color: colors.text.primary,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
  },
  userTimestamp: {
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'right',
  },
  botTimestamp: {
    color: colors.text.secondary,
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
    maxWidth: '80%',
  },
  suggestionPill: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(128,0,32,0.2)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  suggestionText: {
    fontSize: 11,
    color: colors.primary.maroon,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  typingText: {
    fontSize: 12,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    backgroundColor: '#fff',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: 'rgba(128,0,32,0.2)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm + 4,
    fontSize: 14,
    color: colors.text.primary,
    backgroundColor: colors.background.warmWhite,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary.maroon,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});

export default ChatScreen;
