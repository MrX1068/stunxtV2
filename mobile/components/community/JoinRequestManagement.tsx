import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useJoinRequestStore } from '../../stores/joinRequests';
import { JoinRequest } from '../../services/communitySpaceApi';

/**
 * ✅ COMPREHENSIVE JOIN REQUEST MANAGEMENT
 * 
 * Features:
 * - View all pending join requests
 * - Approve/reject with admin response
 * - Professional approval workflow
 * - Real-time updates
 * - User profile preview
 */

interface JoinRequestManagementProps {
  communityId: string;
  visible: boolean;
  onClose: () => void;
}

interface ProcessRequestModalProps {
  request: JoinRequest | null;
  action: 'approve' | 'reject' | null;
  visible: boolean;
  onClose: () => void;
  onConfirm: (adminResponse?: string) => void;
  processing: boolean;
}

const ProcessRequestModal: React.FC<ProcessRequestModalProps> = ({
  request,
  action,
  visible,
  onClose,
  onConfirm,
  processing,
}) => {
  const [adminResponse, setAdminResponse] = useState('');
  const insets = useSafeAreaInsets();

  const handleConfirm = useCallback(() => {
    onConfirm(adminResponse.trim() || undefined);
    setAdminResponse('');
  }, [adminResponse, onConfirm]);

  if (!request || !action) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-center items-center p-4">
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md">
          <Text className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            {action === 'approve' ? '✅ Approve Request' : '❌ Reject Request'}
          </Text>
          
          <View className="mb-4">
            <Text className="text-gray-600 dark:text-gray-400 mb-2">
              From: <Text className="font-semibold">{request.user?.fullName || request.user?.username}</Text>
            </Text>
            {request.message && (
              <View className="bg-gray-100 dark:bg-gray-700 p-3 rounded-xl">
                <Text className="text-gray-700 dark:text-gray-300 italic">
                  "{request.message}"
                </Text>
              </View>
            )}
          </View>

          <View className="mb-6">
            <Text className="text-gray-700 dark:text-gray-300 font-medium mb-2">
              Admin Response (Optional)
            </Text>
            <TextInput
              value={adminResponse}
              onChangeText={setAdminResponse}
              placeholder={
                action === 'approve' 
                  ? "Welcome message..." 
                  : "Reason for rejection..."
              }
              multiline
              numberOfLines={3}
              className="border border-gray-300 dark:border-gray-600 rounded-xl p-3 text-gray-900 dark:text-white bg-white dark:bg-gray-700"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View className="flex-row space-x-3">
            <Pressable
              onPress={onClose}
              disabled={processing}
              className="flex-1 py-3 px-4 bg-gray-200 dark:bg-gray-600 rounded-xl active:scale-95"
            >
              <Text className="text-gray-700 dark:text-gray-300 font-semibold text-center">
                Cancel
              </Text>
            </Pressable>
            
            <Pressable
              onPress={handleConfirm}
              disabled={processing}
              className={`flex-1 py-3 px-4 rounded-xl active:scale-95 ${
                action === 'approve' 
                  ? 'bg-emerald-500' 
                  : 'bg-red-500'
              } ${processing ? 'opacity-70' : ''}`}
            >
              <Text className="text-white font-semibold text-center">
                {processing 
                  ? '⏳ Processing...' 
                  : action === 'approve' 
                    ? 'Approve' 
                    : 'Reject'
                }
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export const JoinRequestManagement: React.FC<JoinRequestManagementProps> = ({
  communityId,
  visible,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const [processModalVisible, setProcessModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<JoinRequest | null>(null);
  const [processAction, setProcessAction] = useState<'approve' | 'reject' | null>(null);

  const {
    pendingRequests,
    pendingRequestsLoading,
    processingRequest,
    fetchPendingRequests,
    approveRequest,
    rejectRequest,
  } = useJoinRequestStore();

  const requests = pendingRequests[communityId] || [];
  const isLoading = pendingRequestsLoading[communityId] || false;

  // Fetch requests on mount
  useEffect(() => {
    if (visible && communityId) {
      fetchPendingRequests(communityId);
    }
  }, [visible, communityId, fetchPendingRequests]);

  const handleApprove = useCallback((request: JoinRequest) => {
    setSelectedRequest(request);
    setProcessAction('approve');
    setProcessModalVisible(true);
  }, []);

  const handleReject = useCallback((request: JoinRequest) => {
    setSelectedRequest(request);
    setProcessAction('reject');
    setProcessModalVisible(true);
  }, []);

  const handleProcessConfirm = useCallback(async (adminResponse?: string) => {
    if (!selectedRequest || !processAction) return;

    try {
      if (processAction === 'approve') {
        await approveRequest(selectedRequest.id, adminResponse);
        Alert.alert('Success', 'Join request approved successfully!');
      } else {
        await rejectRequest(selectedRequest.id, adminResponse);
        Alert.alert('Success', 'Join request rejected successfully!');
      }
      
      setProcessModalVisible(false);
      setSelectedRequest(null);
      setProcessAction(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to process request. Please try again.');
    }
  }, [selectedRequest, processAction, approveRequest, rejectRequest]);

  const renderRequest = useCallback(({ item }: { item: JoinRequest }) => {
    const isProcessing = processingRequest[item.id] || false;
    
    return (
      <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-3 border border-gray-200 dark:border-gray-700">
        <View className="flex-row items-start justify-between mb-3">
          <View className="flex-1">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">
              {item.user?.fullName || item.user?.username || 'Unknown User'}
            </Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {new Date(item.createdAt).toLocaleDateString()} at{' '}
              {new Date(item.createdAt).toLocaleTimeString()}
            </Text>
          </View>
          
          <View className="bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded-lg">
            <Text className="text-amber-700 dark:text-amber-300 text-xs font-medium">
              PENDING
            </Text>
          </View>
        </View>

        {item.message && (
          <View className="bg-gray-50 dark:bg-gray-700 p-3 rounded-xl mb-3">
            <Text className="text-gray-700 dark:text-gray-300 italic">
              "{item.message}"
            </Text>
          </View>
        )}

        <View className="flex-row space-x-3">
          <Pressable
            onPress={() => handleReject(item)}
            disabled={isProcessing}
            className={`flex-1 py-3 px-4 bg-red-500 rounded-xl active:scale-95 ${isProcessing ? 'opacity-70' : ''}`}
          >
            <Text className="text-white font-semibold text-center">
              {isProcessing ? '⏳ Processing...' : '❌ Reject'}
            </Text>
          </Pressable>
          
          <Pressable
            onPress={() => handleApprove(item)}
            disabled={isProcessing}
            className={`flex-1 py-3 px-4 bg-emerald-500 rounded-xl active:scale-95 ${isProcessing ? 'opacity-70' : ''}`}
          >
            <Text className="text-white font-semibold text-center">
              {isProcessing ? '⏳ Processing...' : '✅ Approve'}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }, [handleApprove, handleReject, processingRequest]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-gray-50 dark:bg-gray-900" style={{ paddingTop: insets.top }}>
        {/* Header */}
        <View className="bg-white dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <View className="flex-row items-center justify-between">
            <Text className="text-xl font-bold text-gray-900 dark:text-white">
              Join Requests
            </Text>
            <Pressable
              onPress={onClose}
              className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 active:scale-95"
            >
              <MaterialIcons name="close" size={24} color="#6B7280" />
            </Pressable>
          </View>
        </View>

        {/* Content */}
        <View className="flex-1 p-4">
          {isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text className="text-gray-600 dark:text-gray-400 mt-4">
                Loading requests...
              </Text>
            </View>
          ) : requests.length === 0 ? (
            <View className="flex-1 items-center justify-center">
              <Text className="text-6xl mb-4">📝</Text>
              <Text className="text-xl text-gray-600 dark:text-gray-400 font-semibold text-center">
                No pending requests
              </Text>
              <Text className="text-sm text-gray-500 dark:text-gray-500 text-center mt-2">
                All join requests have been processed
              </Text>
            </View>
          ) : (
            <FlatList
              data={requests}
              renderItem={renderRequest}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          )}
        </View>

        {/* Process Request Modal */}
        <ProcessRequestModal
          request={selectedRequest}
          action={processAction}
          visible={processModalVisible}
          onClose={() => {
            setProcessModalVisible(false);
            setSelectedRequest(null);
            setProcessAction(null);
          }}
          onConfirm={handleProcessConfirm}
          processing={selectedRequest ? (processingRequest[selectedRequest.id] || false) : false}
        />
      </View>
    </Modal>
  );
};
