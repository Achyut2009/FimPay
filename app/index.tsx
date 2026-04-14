import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserMenu } from '@/components/user-menu';
import { useUser } from '@clerk/clerk-expo';
import { Link, Stack } from 'expo-router';
import { PlusIcon, MinusIcon, UsersIcon, BotIcon, ScanLineIcon, SunIcon, MoonStarIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getUserByClerkId, getUserDashboardData, createTransaction, createUser } from '@/db/actions';

const SCREEN_OPTIONS = {
  header: () => (
    <View className="top-safe absolute left-0 right-0 flex-row justify-between px-4 py-2 web:mx-2">
      <ThemeToggle />
      <UserMenu />
    </View>
  ),
};

export default function Screen() {
  const { colorScheme } = useColorScheme();
  const { user: clerkUser } = useUser();
  const [userData, setUserData] = React.useState<any>(null);
  const [dashboardData, setDashboardData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  const loadDashboardData = async () => {
    if (!clerkUser?.id) {
      setLoading(false);
      return;
    }

    try {
      let dbUser = await getUserByClerkId(clerkUser.id);
      
      if (!dbUser) {
        // Create user if they don't exist
        dbUser = await createUser({
          clerkId: clerkUser.id,
          email: clerkUser.primaryEmailAddress?.emailAddress || '',
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          profileImageUrl: clerkUser.imageUrl,
        });
      }

      if (dbUser) {
        setUserData(dbUser);
        const data = await getUserDashboardData(dbUser.id);
        setDashboardData(data);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Set demo data if database is not available
      setDashboardData({
        totalBalance: '0.00',
        recentTransactions: [],
        pendingApprovals: [],
        accounts: []
      });
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadDashboardData();
    }, [clerkUser?.id])
  );

  const handleTransaction = async (type: 'deposit' | 'withdrawal') => {
    Alert.prompt(
      `${type === 'deposit' ? 'Deposit' : 'Withdraw'} Amount`,
      `Enter amount to ${type}:`,
      async (amount) => {
        if (!amount || !userData || !dashboardData?.accounts?.[0]) return;

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
          Alert.alert('Error', 'Please enter a valid amount');
          return;
        }

        // Check if withdrawal amount exceeds balance
        if (type === 'withdrawal' && numAmount > parseFloat(dashboardData.totalBalance)) {
          Alert.alert('Error', 'Insufficient balance');
          return;
        }

        try {
          const requiresApproval = userData.role === 'child' && userData.parentId;
          await createTransaction({
            userId: userData.id,
            accountId: dashboardData.accounts[0].id,
            type,
            amount: numAmount.toString(),
            description: `${type} transaction`,
            requiresApproval
          });

          Alert.alert('Success', `${type} transaction ${requiresApproval ? 'submitted for approval' : 'completed'}!`);
          loadDashboardData();
        } catch (error) {
          Alert.alert('Error', `Failed to ${type}`);
        }
      }
    );
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={SCREEN_OPTIONS} />
      <ScrollView className="flex-1 p-4">
        {/* Welcome Header */}
        <View className="mb-6">
          <Text className="text-2xl font-bold">
            Welcome back{clerkUser?.firstName ? `, ${clerkUser.firstName}` : ''}!
          </Text>
          <Text className="text-muted-foreground">Manage your finances with ease</Text>
        </View>

        {/* Balance Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Total Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <Text className="text-3xl font-bold text-green-600">
              ₹{dashboardData?.totalBalance || '0.00'}
            </Text>
            <Text className="text-muted-foreground">Available balance</Text>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <View className="flex-row gap-3">
              <Button
                className="flex-1"
                onPress={() => handleTransaction('deposit')}
              >
                <Icon as={PlusIcon} size={20} color="white" />
                <Text className="ml-2 text-white">Deposit</Text>
              </Button>
              <Button
                className="flex-1"
                variant="outline"
                onPress={() => handleTransaction('withdrawal')}
              >
                <Icon as={MinusIcon} size={20} />
                <Text className="ml-2">Withdraw</Text>
              </Button>
            </View>
          </CardContent>
        </Card>

        {/* Family Account Status */}
        {userData && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Joint Family Account</CardTitle>
            </CardHeader>
            <CardContent>
              {userData.role === 'child' && userData.parentId ? (
                <View className="flex-row items-center gap-2">
                  <Icon as={UsersIcon} size={20} color="green" />
                  <Text className="text-green-600">Connected to Family Account</Text>
                </View>
              ) : userData.role === 'parent' ? (
                <View className="flex-row items-center gap-2">
                  <Icon as={UsersIcon} size={20} color="blue" />
                  <Text className="text-blue-600">Family Account Manager</Text>
                </View>
              ) : (
                <View className="flex-row items-center gap-2">
                  <Icon as={UsersIcon} size={20} color="gray" />
                  <Text className="text-muted-foreground">Not connected to family account</Text>
                </View>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recent Transactions */}
        {dashboardData?.recentTransactions && dashboardData.recentTransactions.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData.recentTransactions.slice(0, 5).map((transaction: any) => (
                <View key={transaction.id} className="flex-row justify-between items-center py-3 border-b border-border">
                  <View>
                    <Text className="font-medium capitalize">{transaction.type}</Text>
                    <Text className="text-sm text-muted-foreground">
                      {transaction.description || 'Transaction'}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text className={`font-bold text-lg ${
                    transaction.type === 'deposit' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.type === 'deposit' ? '+' : '-'}₹{transaction.amount}
                  </Text>
                </View>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Navigation Cards */}
        <View className="flex-row gap-3 mb-6">
          <Link href="/ai" asChild>
            <Button className="flex-1 h-20" variant="outline">
              <View className="items-center gap-2">
                <Icon as={BotIcon} size={24} />
                <Text className="text-sm">AI Assistant</Text>
              </View>
            </Button>
          </Link>
          <Link href="/scanner" asChild>
            <Button className="flex-1 h-20" variant="outline">
              <View className="items-center gap-2">
                <Icon as={ScanLineIcon} size={24} />
                <Text className="text-sm">Scanner</Text>
              </View>
            </Button>
          </Link>
        </View>

        {/* Pending Approvals for Parents */}
        {dashboardData?.pendingApprovals && dashboardData.pendingApprovals.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Pending Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              <Text className="text-sm text-muted-foreground mb-2">
                Transactions from family members requiring your approval
              </Text>
              {dashboardData.pendingApprovals.map((approval: any) => (
                <View key={approval.id} className="p-3 bg-yellow-50 rounded mb-2">
                  <Text className="font-medium">{approval.description}</Text>
                  <Text className="text-sm text-muted-foreground">
                    Amount: ₹{approval.amount}
                  </Text>
                  <Text className="text-sm text-muted-foreground">
                    Status: {approval.status}
                  </Text>
                </View>
              ))}
            </CardContent>
          </Card>
        )}
      </ScrollView>
    </>
  );
}

const THEME_ICONS = {
  light: SunIcon,
  dark: MoonStarIcon,
};

function ThemeToggle() {
  const { colorScheme, toggleColorScheme } = useColorScheme();

  return (
    <Button onPress={toggleColorScheme} size="icon" variant="ghost" className="rounded-full">
      <Icon as={THEME_ICONS[colorScheme ?? 'light']} className="size-6" />
    </Button>
  );
}
