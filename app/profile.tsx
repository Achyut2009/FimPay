import { Stack } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import * as React from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useFocusEffect } from '@react-navigation/native';
import { getUserByClerkId, getUserDashboardData, getFamilyRequests, getUserChildren, createFamilyRequest, approveFamilyRequest, getUserByEmail, createUser } from '@/db/actions';

export default function ProfileScreen() {
  const { user: clerkUser } = useUser();
  const [userData, setUserData] = React.useState<any>(null);
  const [dashboardData, setDashboardData] = React.useState<any>(null);
  const [familyRequests, setFamilyRequests] = React.useState<any[]>([]);
  const [children, setChildren] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  const loadUserData = async () => {
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

        // Load family requests if user is a parent
        if (dbUser.role === 'parent') {
          const requests = await getFamilyRequests(dbUser.id);
          setFamilyRequests(requests);
          const userChildren = await getUserChildren(dbUser.id);
          setChildren(userChildren);
        }
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
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadUserData();
    }, [clerkUser?.id])
  );

  const handleJoinFamilyAccount = async () => {
    Alert.prompt(
      'Join Family Account',
      'Enter parent email address:',
      async (parentEmail) => {
        if (!parentEmail || !userData) return;

        try {
          // Find parent by email
          const parent = await getUserByEmail(parentEmail); // Search by email
          if (!parent) {
            Alert.alert('Error', 'Parent not found with this email');
            return;
          }

          await createFamilyRequest({
            childId: userData.id,
            parentId: parent.id,
            message: `${userData.firstName} wants to join your family account`
          });

          Alert.alert('Success', 'Family account request sent!');
          loadUserData();
        } catch (error) {
          Alert.alert('Error', 'Failed to send request');
        }
      }
    );
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      await approveFamilyRequest(requestId);
      Alert.alert('Success', 'Family member approved!');
      loadUserData();
    } catch (error) {
      Alert.alert('Error', 'Failed to approve request');
    }
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
      <Stack.Screen options={{ title: 'Profile' }} />
      <ScrollView className="flex-1 p-4">
        {/* User Info Card */}
        <Card className="mb-4">
          <CardHeader>
            <View className="flex-row items-center gap-3">
              <Avatar className="w-16 h-16" alt={`${clerkUser?.firstName} ${clerkUser?.lastName} avatar`}>
                <AvatarImage source={{ uri: clerkUser?.imageUrl }} />
                <AvatarFallback>
                  {clerkUser?.firstName?.[0] || clerkUser?.username?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              <View>
                <CardTitle>{clerkUser?.firstName} {clerkUser?.lastName}</CardTitle>
                <Text className="text-muted-foreground">{clerkUser?.primaryEmailAddress?.emailAddress}</Text>
                <Text className="text-sm text-muted-foreground capitalize">
                  Role: {userData?.role || 'Child'}
                </Text>
              </View>
            </View>
          </CardHeader>
        </Card>

        {/* Account Balance Card */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Account Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <Text className="text-2xl font-bold text-green-600">
              ₹{dashboardData?.totalBalance || '0.00'}
            </Text>
            <Text className="text-muted-foreground">Total Balance</Text>
          </CardContent>
        </Card>

        {/* Joint Family Account Section */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Joint Family Account</CardTitle>
          </CardHeader>
          <CardContent className="gap-3">
            {userData?.role === 'child' && !userData?.parentId && (
              <Button onPress={handleJoinFamilyAccount}>
                <Text>Join Family Account</Text>
              </Button>
            )}

            {userData?.role === 'child' && userData?.parentId && (
              <View>
                <Text className="text-green-600">✓ Connected to Family Account</Text>
                <Text className="text-sm text-muted-foreground">
                  Your transactions require parental approval
                </Text>
              </View>
            )}

            {userData?.role === 'parent' && (
              <View className="gap-3">
                <Text className="font-medium">Family Members:</Text>
                {children.map((child) => (
                  <View key={child.id} className="flex-row justify-between items-center p-2 bg-muted rounded">
                    <Text>{child.firstName} {child.lastName}</Text>
                    <Text className="text-sm text-muted-foreground">{child.email}</Text>
                  </View>
                ))}

                {familyRequests.length > 0 && (
                  <View className="mt-4">
                    <Text className="font-medium mb-2">Pending Requests:</Text>
                    {familyRequests
                      .filter(req => req.status === 'pending')
                      .map((request) => (
                      <View key={request.id} className="p-3 bg-orange-50 rounded mb-2">
                        <Text>{request.message}</Text>
                        <View className="flex-row gap-2 mt-2">
                          <Button
                            size="sm"
                            onPress={() => handleApproveRequest(request.id)}
                          >
                            <Text>Approve</Text>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onPress={() => {/* Handle reject */}}
                          >
                            <Text>Reject</Text>
                          </Button>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        {dashboardData?.recentTransactions && dashboardData.recentTransactions.length > 0 && (
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData.recentTransactions.slice(0, 5).map((transaction: any) => (
                <View key={transaction.id} className="flex-row justify-between items-center py-2">
                  <View>
                    <Text className="font-medium capitalize">{transaction.type}</Text>
                    <Text className="text-sm text-muted-foreground">{transaction.description}</Text>
                  </View>
                  <Text className={`font-medium ${transaction.type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                    {transaction.type === 'deposit' ? '+' : '-'}₹{transaction.amount}
                  </Text>
                </View>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Pending Approvals for Parents */}
        {dashboardData?.pendingApprovals && dashboardData.pendingApprovals.length > 0 && (
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Pending Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData.pendingApprovals.map((approval: any) => (
                <View key={approval.id} className="p-3 bg-yellow-50 rounded mb-2">
                  <Text className="font-medium">{approval.description}</Text>
                  <Text className="text-sm text-muted-foreground">
                    Amount: ₹{approval.amount}
                  </Text>
                  <Text className="text-sm text-muted-foreground">
                    Child: {approval.child?.firstName} {approval.child?.lastName}
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