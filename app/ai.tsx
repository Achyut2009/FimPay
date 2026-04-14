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
  Alert,
} from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
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
  Target,
  TrendingUp,
  Wallet,
} from 'lucide-react-native';
import { getUserByClerkId, getUserDashboardData, getUserBudgets, createBudget, getUserAIChats, saveAIChat } from '@/db/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Text as UIText } from '@/components/ui/text';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface BudgetSuggestion {
  category: string;
  amount: number;
  reason: string;
}

// Google AI Studio (Gemini) API integration
const GEMINI_API_KEY = "";
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

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
  const { user: clerkUser } = useUser();
  const router = useRouter();
  const [userData, setUserData] = React.useState<any>(null);
  const [dashboardData, setDashboardData] = React.useState<any>(null);
  const [budgets, setBudgets] = React.useState<any[]>([]);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: `Hello! 👋 I'm your AI Budget Assistant. I can help you with:\n\n• Budget planning and analysis\n• Spending insights\n• Savings recommendations\n• Financial goal setting\n\nHow can I help you manage your finances today?`,
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

  const loadUserData = async () => {
    if (!clerkUser?.id) return;

    try {
      const dbUser = await getUserByClerkId(clerkUser.id);
      if (dbUser) {
        setUserData(dbUser);
        const data = await getUserDashboardData(dbUser.id);
        setDashboardData(data);
        const userBudgets = await getUserBudgets(dbUser.id);
        setBudgets(userBudgets);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      // Set demo data if database is not available
      setUserData({
        id: 'demo-user',
        email: clerkUser?.primaryEmailAddress?.emailAddress || 'demo@example.com',
        firstName: clerkUser?.firstName || 'Demo',
        lastName: clerkUser?.lastName || 'User',
        role: 'child'
      });
      setDashboardData({
        totalBalance: '0.00',
        recentTransactions: [],
        pendingApprovals: [],
        accounts: []
      });
      setBudgets([]);
    }
  };

  useEffect(() => {
    loadUserData();
  }, [clerkUser?.id]);

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

  // Google AI Studio (Gemini) API call for budget planning
  const fetchGeminiResponse = async (prompt: string): Promise<string> => {
    if (!GEMINI_API_KEY) {
      return "I'm currently not configured with AI capabilities. Please check your API settings.";
    }

    try {
      const budgetContext = dashboardData ? `
        Current financial data:
        - Total Balance: ₹${dashboardData.totalBalance}
        - Recent transactions: ${dashboardData.recentTransactions?.slice(0, 5).map((t: any) =>
          `${t.type}: ₹${t.amount} (${t.description})`
        ).join(', ')}
        - Active budgets: ${budgets.map((b: any) =>
          `${b.category}: ₹${b.amount} (spent: ₹${b.spent})`
        ).join(', ')}
      ` : '';

      const enhancedPrompt = `
        You are a financial advisor AI assistant. Help the user with budget planning and financial advice.

        ${budgetContext}

        User question: ${prompt}

        Provide helpful, accurate financial advice. Keep responses concise but informative.
        Focus on practical budget planning, savings strategies, and financial wellness.
      `;

      const response = await fetchWithTimeout(
        `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: enhancedPrompt
              }]
            }]
          }),
        },
        30000
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "I apologize, but I couldn't generate a response right now. Please try again.";

      return aiResponse;
    } catch (error) {
      console.error('Gemini API error:', error);
      return "I'm having trouble connecting to my AI services. Please check your internet connection and try again.";
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const aiResponse = await fetchGeminiResponse(inputText);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);

      // Save to database (optional - won't crash if DB is not available)
      if (userData) {
        try {
          await saveAIChat({
            userId: userData.id,
            message: inputText,
            response: aiResponse,
          });
        } catch (dbError) {
          console.warn('Could not save chat to database:', dbError);
          // Continue without saving - demo mode
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I encountered an error. Please try again.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([{
      id: '1',
      text: `Hello! 👋 I'm your AI Budget Assistant. How can I help you manage your finances today?`,
      isUser: false,
      timestamp: new Date(),
    }]);
    closeSettings();
  };

  const quickSuggestions = [
    "Create a monthly budget for me",
    "How can I save more money?",
    "Analyze my spending patterns",
    "Set financial goals",
  ];

  return (
    <>
      <Stack.Screen options={{ title: 'AI Budget Assistant' }} />
      <SafeAreaView className="flex-1 bg-background">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          {/* Header */}
          <View className="flex-row justify-between items-center p-4 border-b border-border">
            <TouchableOpacity onPress={() => router.back()}>
              <ChevronLeft size={24} color="#666" />
            </TouchableOpacity>
            <Text className="text-lg font-semibold">AI Budget Assistant</Text>
            <TouchableOpacity onPress={openSettings}>
              <Settings size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Financial Overview Cards */}
          {dashboardData && (
            <View className="px-4 py-2">
              <View className="flex-row gap-2">
                <Card className="flex-1">
                  <CardContent className="p-3">
                    <View className="flex-row items-center gap-2">
                      <Wallet size={16} color="#10B981" />
                      <UIText className="text-sm font-medium">Balance</UIText>
                    </View>
                    <UIText className="text-lg font-bold text-green-600">
                      ₹{dashboardData.totalBalance}
                    </UIText>
                  </CardContent>
                </Card>
                <Card className="flex-1">
                  <CardContent className="p-3">
                    <View className="flex-row items-center gap-2">
                      <Target size={16} color="#3B82F6" />
                      <UIText className="text-sm font-medium">Budgets</UIText>
                    </View>
                    <UIText className="text-lg font-bold text-blue-600">
                      {budgets.length}
                    </UIText>
                  </CardContent>
                </Card>
              </View>
            </View>
          )}

          {/* Messages */}
          <ScrollView
            ref={scrollViewRef}
            className="flex-1 px-4"
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.map((message) => (
              <View
                key={message.id}
                className={`flex-row mb-4 ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!message.isUser && (
                  <View className="w-8 h-8 rounded-full bg-blue-500 items-center justify-center mr-2">
                    <Bot size={16} color="white" />
                  </View>
                )}
                <View
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.isUser
                      ? 'bg-blue-500 rounded-br-sm'
                      : 'bg-gray-100 rounded-bl-sm'
                  }`}
                >
                  <Text
                    className={`text-sm ${
                      message.isUser ? 'text-white' : 'text-gray-800'
                    }`}
                  >
                    {message.text}
                  </Text>
                  <Text
                    className={`text-xs mt-1 ${
                      message.isUser ? 'text-blue-100' : 'text-gray-500'
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                </View>
                {message.isUser && (
                  <View className="w-8 h-8 rounded-full bg-gray-300 items-center justify-center ml-2">
                    <User size={16} color="#666" />
                  </View>
                )}
              </View>
            ))}
            {isLoading && (
              <View className="flex-row mb-4 justify-start">
                <View className="w-8 h-8 rounded-full bg-blue-500 items-center justify-center mr-2">
                  <Bot size={16} color="white" />
                </View>
                <View className="bg-gray-100 p-3 rounded-lg rounded-bl-sm">
                  <Text className="text-gray-800 text-sm">Thinking...</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Quick Suggestions */}
          {messages.length === 1 && (
            <View className="px-4 pb-2">
              <Text className="text-sm font-medium text-gray-600 mb-2">Quick suggestions:</Text>
              <View className="flex-row flex-wrap gap-2">
                {quickSuggestions.map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    className="bg-gray-100 px-3 py-2 rounded-full"
                    onPress={() => setInputText(suggestion)}
                  >
                    <Text className="text-sm text-gray-700">{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Input */}
          <View className="p-4 border-t border-border">
            <View className="flex-row items-center gap-2">
              <TextInput
                className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm"
                placeholder="Ask me about budgeting, savings, or financial planning..."
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={sendMessage}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                className={`w-10 h-10 rounded-full items-center justify-center ${
                  inputText.trim() && !isLoading ? 'bg-blue-500' : 'bg-gray-300'
                }`}
                onPress={sendMessage}
                disabled={!inputText.trim() || isLoading}
              >
                <Send size={18} color={inputText.trim() && !isLoading ? 'white' : '#999'} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Settings Modal */}
          <Modal visible={settingsVisible} transparent animationType="none">
            <View className="flex-1 bg-black/50 justify-end">
              <Animated.View
                style={{
                  transform: [{ translateY: slideAnim }],
                  backgroundColor: 'white',
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  padding: 20,
                  minHeight: SCREEN_HEIGHT * 0.3,
                }}
              >
                <View className="flex-row justify-between items-center mb-4">
                  <Text className="text-lg font-semibold">Settings</Text>
                  <TouchableOpacity onPress={closeSettings}>
                    <X size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  className="flex-row items-center p-3 bg-red-50 rounded-lg mb-2"
                  onPress={() => setClearChatVisible(true)}
                >
                  <Trash2 size={20} color="#EF4444" />
                  <Text className="ml-3 text-red-600">Clear Chat History</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-row items-center p-3 bg-blue-50 rounded-lg"
                  onPress={() => Alert.alert('Info', 'AI Budget Assistant v1.0\nPowered by Google Gemini')}
                >
                  <Zap size={20} color="#3B82F6" />
                  <Text className="ml-3 text-blue-600">About</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </Modal>

          {/* Clear Chat Confirmation */}
          <Modal visible={clearChatVisible} transparent animationType="fade">
            <View className="flex-1 bg-black/50 items-center justify-center">
              <View className="bg-white p-6 rounded-lg mx-4">
                <Text className="text-lg font-semibold mb-2">Clear Chat History?</Text>
                <Text className="text-gray-600 mb-4">
                  This will permanently delete all your conversation history with the AI assistant.
                </Text>
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    className="flex-1 bg-gray-200 p-3 rounded-lg items-center"
                    onPress={() => setClearChatVisible(false)}
                  >
                    <Text className="font-medium">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 bg-red-500 p-3 rounded-lg items-center"
                    onPress={clearChat}
                  >
                    <Text className="font-medium text-white">Clear</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}
