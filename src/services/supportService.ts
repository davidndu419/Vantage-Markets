import {
  collection,
  doc,
  setDoc,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { SupportChat, SupportMessage } from '../types';

export const supportService = {
  async sendMessage(
    chatId: string,
    message: string,
    senderId: string,
    senderRole: 'user' | 'admin',
    userName = 'Trader'
  ): Promise<void> {
    try {
      const now = new Date();
      
      // 1. Add document to supportMessages
      const messagesCol = collection(db, 'supportMessages');
      await addDoc(messagesCol, {
        chatId,
        senderId,
        senderRole,
        message,
        createdAt: now,
      });

      // 2. Upsert supportChats summary document
      const chatDocRef = doc(db, 'supportChats', chatId);
      await setDoc(
        chatDocRef,
        {
          id: chatId,
          userId: chatId, // Chat ID is the user ID
          userName,
          lastMessage: message,
          lastMessageAt: now,
          unreadByAdmin: senderRole === 'user',
          unreadByUser: senderRole === 'admin',
        },
        { merge: true }
      );
    } catch (error) {
      console.error('Error sending support message:', error);
      throw error;
    }
  },

  onSupportMessagesChange(chatId: string, callback: (messages: SupportMessage[]) => void) {
    const messagesCol = collection(db, 'supportMessages');
    const q = query(
      messagesCol,
      where('chatId', '==', chatId),
      orderBy('createdAt', 'asc')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const messages = snapshot.docs.map((docSnapshot) => ({
          id: docSnapshot.id,
          ...docSnapshot.data(),
        })) as SupportMessage[];
        callback(messages);
      },
      (error) => {
        console.error('Error listening to support messages:', error);
      }
    );
  },

  onSupportChatsChange(callback: (chats: SupportChat[]) => void) {
    const chatsCol = collection(db, 'supportChats');
    const q = query(chatsCol, orderBy('lastMessageAt', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const chats = snapshot.docs.map((docSnapshot) => ({
          id: docSnapshot.id,
          ...docSnapshot.data(),
        })) as SupportChat[];
        callback(chats);
      },
      (error) => {
        console.error('Error listening to support chats:', error);
      }
    );
  },

  async markChatAsReadByAdmin(chatId: string): Promise<void> {
    try {
      const chatDocRef = doc(db, 'supportChats', chatId);
      await updateDoc(chatDocRef, { unreadByAdmin: false });
    } catch (error) {
      console.error('Error marking chat as read by admin:', error);
    }
  },

  async markChatAsReadByUser(chatId: string): Promise<void> {
    try {
      const chatDocRef = doc(db, 'supportChats', chatId);
      await updateDoc(chatDocRef, { unreadByUser: false });
    } catch (error) {
      console.error('Error marking chat as read by user:', error);
    }
  },
};
export default supportService;
