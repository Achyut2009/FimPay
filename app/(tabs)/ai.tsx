import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Animated,
  Dimensions,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Send,
  User,
  Bot,
  Settings,
  X,
  ChevronLeft,
  Plus,
  Trash2,
  Clock,
  Zap,
} from 'lucide-react-native';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

// Custom fetch with timeout
const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 30000) => {
  const controller = new AbortController();
  const { signal } = controller;

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

export default function AIScreen() {
  const { user } = useUser();
  const router = useRouter();

  // Personal greeting
  const userFirstName = user?.firstName || 'User';
  const userLastName = user?.lastName || '';

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: `Hello ${userFirstName} ${userLastName}! 👋 I'm your AI assistant. How can I help you today?`,
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [clearChatVisible, setClearChatVisible] = useState(false);
  const slideAnim = useState(new Animated.Value(SCREEN_HEIGHT))[0];
  const scrollViewRef = useRef<ScrollView>(null);

  // Read your real API endpoint from .env - with better error handling
  const AI_API = "process.env.AI_API";

  const openSettings = () => {
    setSettingsVisible(true);
    setTimeout(() => {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 10);
  };

  const closeSettings = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setSettingsVisible(false);
      setClearChatVisible(false);
    });
  };

  // Improved AI API call with better error handling
  const fetchAIResponse = async (prompt: string): Promise<string> => {
    // Check if API endpoint is configured
    if (!AI_API) {
      console.error('AI_API environment variable is not set');
      return "I'm currently not configured properly. Please check the API settings.";
    }

    try {
      console.log('Sending request to AI API...');
      
      const response = await fetchWithTimeout(
        AI_API,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: prompt.trim(),
            user: `${userFirstName} ${userLastName}`.trim(),
            timestamp: new Date().toISOString(),
          }),
        },
        30000 // 30 second timeout
      );

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API response not OK:', response.status, errorText);
        
        if (response.status === 401) {
          return "I'm having trouble authenticating with the AI service. Please check your API configuration.";
        } else if (response.status === 429) {
          return "I'm receiving too many requests right now. Please wait a moment and try again.";
        } else if (response.status >= 500) {
          return "The AI service is currently experiencing issues. Please try again later.";
        } else {
          throw new Error(`API returned status ${response.status}: ${errorText}`);
        }
      }

      const data = await response.json();
      console.log('API response data:', data);

      // Handle various response formats
      if (data.reply) {
        return data.reply;
      } else if (data.message) {
        return data.message;
      } else if (data.output) {
        return data.output;
      } else if (data.choices && data.choices[0] && data.choices[0].text) {
        return data.choices[0].text;
      } else if (data.choices && data.choices[0] && data.choices[0].message) {
        return data.choices[0].message.content;
      } else if (data.response) {
        return data.response;
      } else if (typeof data === 'string') {
        return data;
      } else {
        console.warn('Unexpected API response format:', data);
        return "I received your message but couldn't process the response format.";
      }
    } catch (err: any) {
      console.error('AI API Error:', err);
      
      // More specific error messages
      if (err.name === 'AbortError' || err.message?.includes('timeout') || err.message?.includes('abort')) {
        return "The request took too long to complete. Please try again in a moment.";
      } else if (err.message?.includes('Network request failed') || err.message?.includes('fetch')) {
        return "I'm having trouble connecting to the network. Please check your internet connection and try again.";
      } else if (err.message?.includes('Failed to fetch')) {
        return "I couldn't reach the AI service. Please check your API endpoint and try again.";
      } else {
        return "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.";
      }
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const responseText = await fetchAIResponse(inputText);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error: any) {
      console.error('Error in handleSendMessage:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: error.message || "I'm sorry, something went wrong. Please try again later.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setClearChatVisible(true);
  };

  const confirmClearChat = () => {
    setMessages([
      {
        id: '1',
        text: `Hello ${userFirstName} ${userLastName}! 👋 I'm your AI assistant. How can I help you today?`,
        isUser: false,
        timestamp: new Date(),
      },
    ]);
    closeSettings();
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Improved MessageBubble with better text handling
  const MessageBubble = ({ message }: { message: Message }) => (
    <View 
      className={`flex-row mb-4 ${message.isUser ? 'justify-end' : 'justify-start'} px-1`}
      style={{ maxWidth: '100%' }}
    >
      <View 
        className={`flex-row ${message.isUser ? 'flex-row-reverse' : ''}`}
        style={{ maxWidth: SCREEN_WIDTH * 0.85 }}
      >
        <View
          className={`w-8 h-8 rounded-full items-center justify-center flex-shrink-0 ${
            message.isUser ? 'bg-blue-500 ml-3' : 'bg-purple-500 mr-3'
          }`}
        >
          {message.isUser ? (
            <User size={16} color="#ffffff" />
          ) : (
            <Bot size={16} color="#ffffff" />
          )}
        </View>

        <View
          className={`rounded-2xl p-3 flex-1 ${
            message.isUser 
              ? 'bg-blue-500 rounded-br-none' 
              : 'bg-gray-100 rounded-bl-none'
          }`}
          style={{ 
            minWidth: 0, // Important for text wrapping
          }}
        >
          <Text 
            className={`text-base leading-5 ${
              message.isUser ? 'text-white' : 'text-gray-800'
            }`}
            style={{
              flexWrap: 'wrap',
              includeFontPadding: false,
              textAlignVertical: 'center',
            }}
            selectable={true}
          >
            {message.text}
          </Text>
          <Text 
            className={`text-xs mt-2 ${
              message.isUser ? 'text-blue-200' : 'text-gray-500'
            }`}
          >
            {formatTime(message.timestamp)}
          </Text>
        </View>
      </View>
    </View>
  );

  const SettingsItem = ({ icon: Icon, title, subtitle, onPress, isDestructive = false }: any) => (
    <TouchableOpacity 
      className="flex-row items-center py-4 border-b border-gray-100" 
      onPress={onPress}
    >
      <View
        className={`w-10 h-10 rounded-lg items-center justify-center ${
          isDestructive ? 'bg-red-50' : 'bg-gray-50'
        }`}
      >
        <Icon size={20} color={isDestructive ? '#dc2626' : '#374151'} />
      </View>
      <View className="flex-1 ml-4" style={{ minWidth: 0 }}>
        <Text
          className={`text-base font-semibold ${isDestructive ? 'text-red-600' : 'text-gray-900'}`}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle && (
          <Text className="text-gray-500 text-sm mt-1" numberOfLines={2}>
            {subtitle}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <LinearGradient colors={['#6366f1', '#8b5cf6']} className="px-4 pt-6 pb-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 items-center justify-center bg-white/20 rounded-full mr-3"
            >
              <ChevronLeft size={20} color="#ffffff" />
            </TouchableOpacity>
            <View className="flex-1" style={{ minWidth: 0 }}>
              <Text 
                className="text-white text-lg font-bold" 
                numberOfLines={1}
              >
                Fipa AI-Assistant
              </Text>
              <Text 
                className="text-white/80 text-sm" 
                numberOfLines={1}
              >
                Hello {userFirstName} {userLastName}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={openSettings}
            className="w-10 h-10 items-center justify-center bg-white/20 rounded-full ml-2"
          >
            <Settings size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Chat Area */}
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 px-3"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ 
            paddingVertical: 12,
            paddingBottom: 20 
          }}
        >
          {messages.map(message => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {isLoading && (
            <View className="flex-row mb-4 justify-start px-1">
              <View className="flex-row" style={{ maxWidth: SCREEN_WIDTH * 0.85 }}>
                <View className="w-8 h-8 rounded-full bg-purple-500 items-center justify-center mr-3 flex-shrink-0">
                  <Bot size={16} color="#ffffff" />
                </View>
                <View className="bg-gray-100 rounded-2xl rounded-bl-none p-4 flex-1">
                  <View className="flex-row space-x-1">
                    <View className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
                    <View
                      className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"
                      style={{ animationDelay: '0.2s' }}
                    />
                    <View
                      className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"
                      style={{ animationDelay: '0.4s' }}
                    />
                  </View>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input Area */}
        <View className="border-t border-gray-200 px-3 py-3 bg-white">
          <View className="flex-row items-end space-x-2">
            <TextInput
              className="flex-1 bg-gray-100 rounded-2xl px-4 py-3 text-gray-900 text-base"
              style={{ 
                maxHeight: 100,
                textAlignVertical: 'center',
              }}
              placeholder="Type your message..."
              placeholderTextColor="#9ca3af"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
              onSubmitEditing={handleSendMessage}
              returnKeyType="send"
              editable={!isLoading}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              className={`w-12 h-12 rounded-2xl items-center justify-center ${
                inputText.trim() && !isLoading ? 'bg-blue-500' : 'bg-gray-300'
              }`}
              onPress={handleSendMessage}
              disabled={!inputText.trim() || isLoading}
            >
              <Send
                size={20}
                color={inputText.trim() && !isLoading ? '#ffffff' : '#9ca3af'}
              />
            </TouchableOpacity>
          </View>
          {inputText.length > 0 && (
            <Text className="text-xs text-gray-500 text-right mt-1 px-1">
              {inputText.length}/1000
            </Text>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Settings Modal */}
      <Modal
        visible={settingsVisible}
        transparent={true}
        animationType="none"
        onRequestClose={closeSettings}
        statusBarTranslucent={true}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <TouchableOpacity
            className="absolute top-0 left-0 right-0 bottom-0"
            activeOpacity={1}
            onPress={closeSettings}
          />

          <Animated.View
            className="bg-white rounded-t-3xl overflow-hidden"
            style={{
              transform: [{ translateY: slideAnim }],
              maxHeight: SCREEN_HEIGHT * 0.6,
            }}
          >
            <View className="items-center py-3">
              <View className="w-12 h-1 bg-gray-300 rounded-full" />
            </View>

            <View className="flex-row items-center justify-between px-4 pb-4 border-b border-gray-200">
              <Text className="text-xl font-bold text-gray-900">AI Settings</Text>
              <TouchableOpacity onPress={closeSettings}>
                <X size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              showsVerticalScrollIndicator={false} 
              contentContainerStyle={{ paddingBottom: 30 }}
            >
              <View className="px-4 pt-4">
                <Text className="text-gray-500 text-sm font-medium uppercase mb-3">
                  AI Assistant
                </Text>

                <View className="flex-row items-center py-3 border-b border-gray-100">
                  <View className="w-10 h-10 rounded-lg bg-purple-100 items-center justify-center flex-shrink-0">
                    <Zap size={20} color="#8b5cf6" />
                  </View>
                  <View className="flex-1 ml-3" style={{ minWidth: 0 }}>
                    <Text className="text-gray-900 text-base font-semibold" numberOfLines={1}>
                      Model Version
                    </Text>
                    <Text className="text-gray-500 text-sm mt-1" numberOfLines={1}>
                      {AI_API ? 'Connected to your AI API' : 'API not configured'}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center py-3 border-b border-gray-100">
                  <View className="w-10 h-10 rounded-lg bg-blue-100 items-center justify-center flex-shrink-0">
                    <Clock size={20} color="#3b82f6" />
                  </View>
                  <View className="flex-1 ml-3" style={{ minWidth: 0 }}>
                    <Text className="text-gray-900 text-base font-semibold" numberOfLines={1}>
                      Response Time
                    </Text>
                    <Text className="text-gray-500 text-sm mt-1" numberOfLines={1}>
                      Depends on network & API
                    </Text>
                  </View>
                </View>
              </View>

              <View className="px-4 pt-4">
                <Text className="text-gray-500 text-sm font-medium uppercase mb-3">
                  Chat Management
                </Text>

                <SettingsItem
                  icon={Plus}
                  title="New Chat"
                  subtitle="Start a fresh conversation"
                  onPress={() => {
                    setClearChatVisible(false);
                    confirmClearChat();
                  }}
                />

                <SettingsItem
                  icon={Trash2}
                  title="Clear Chat History"
                  subtitle="Permanently delete all messages"
                  onPress={handleClearChat}
                  isDestructive
                />
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* Clear Chat Confirmation */}
      <Modal
        visible={clearChatVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setClearChatVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-4">
          <View className="bg-white rounded-2xl p-5 w-full max-w-sm">
            <View className="items-center mb-4">
              <View className="w-12 h-12 bg-red-100 rounded-full items-center justify-center mb-3">
                <Trash2 size={24} color="#dc2626" />
              </View>
              <Text className="text-xl font-bold text-gray-900 text-center">
                Clear Chat History
              </Text>
            </View>

            <Text className="text-gray-600 text-center mb-4 text-base leading-6">
              Are you sure you want to clear all chat history? This action cannot be undone.
            </Text>

            <View className="flex-row space-x-3">
              <TouchableOpacity
                className="flex-1 bg-gray-100 rounded-xl py-3"
                onPress={() => setClearChatVisible(false)}
              >
                <Text className="text-gray-700 font-semibold text-center text-base">
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 bg-red-600 rounded-xl py-3"
                onPress={confirmClearChat}
              >
                <Text className="text-white font-semibold text-center text-base">
                  Clear
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}