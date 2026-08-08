import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { AlertTriangle, Bell, Clock } from 'lucide-react-native';
import { presentLocalNotification, scheduleLocalNotification, type NotificationCategoryType } from '@/services/notification-service';

interface TestNotificationModalProps {
  open: boolean;
  onClose: () => void;
  onAlertReceived: (title: string, body: string) => void;
}

const typeOptions: { id: NotificationCategoryType; label: string; description: string }[] = [
  { id: 'general', label: '一般通知', description: '天氣提醒等一般訊息，點擊無動作' },
  { id: 'alert', label: '預警通知', description: '災防警報，點擊會開啟警報視窗' },
];

export function TestNotificationModal({ open, onClose, onAlertReceived }: TestNotificationModalProps) {
  const [type, setType] = useState<NotificationCategoryType>('general');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState<'none' | 'now' | 'scheduled'>('none');
  const [status, setStatus] = useState('');

  const trimmedTitle = title.trim();
  const trimmedBody = body.trim();
  const canSend = trimmedTitle.length > 0 && trimmedBody.length > 0 && sending === 'none';
  const defaultTitle = useMemo(() => (type === 'alert' ? '颱風強風即時告警' : '今日天氣提醒'), [type]);
  const defaultBody = useMemo(() => (
    type === 'alert'
      ? '[測試]您所在地區即將出現強風，請立即停止戶外活動並進入堅固建築物躲避。'
      : '目前天氣晴時多雲，溫度 22 度，請記得攜帶薄外套。'
  ), [type]);

  const close = () => {
    if (sending !== 'none') return;
    setStatus('');
    onClose();
  };

  const send = async (scheduled: boolean) => {
    if (!trimmedTitle || !trimmedBody) return;
    const payload = { type, title: trimmedTitle, body: trimmedBody };
    setSending(scheduled ? 'scheduled' : 'now');
    setStatus('');
    try {
      const identifier = scheduled
        ? await scheduleLocalNotification(payload, 30)
        : await presentLocalNotification(payload);
      if (identifier === null) {
        setStatus('未取得通知權限，請到系統設定允許通知後再試。');
      } else if (type === 'alert') {
        onAlertReceived(trimmedTitle, trimmedBody);
        setStatus(scheduled ? '已排程，30 秒後發送。' : '已發送預警通知。');
      } else {
        setStatus(scheduled ? '已排程，30 秒後發送。' : '已發送一般通知。');
      }
    } catch (error) {
      setStatus('發送失敗，請稍後再試。');
    } finally {
      setSending('none');
    }
  };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(15,23,42,0.42)' }}>
        <Pressable onPress={close} style={{ position: 'absolute', inset: 0 }} />
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 28, borderCurve: 'continuous', padding: 22, boxShadow: '0 16px 40px rgba(0,0,0,0.18)', maxHeight: '88%' }}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Bell size={18} color="#2563EB" />
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E293B' }}>發送測試通知</Text>
              </View>
              <Pressable onPress={close} style={({ pressed }) => ({ padding: 6, borderRadius: 999, backgroundColor: '#F8FAFC', transform: [{ scale: pressed ? 0.95 : 1 }] })}>
                <Text style={{ color: '#94A3B8', fontSize: 16, lineHeight: 20 }}>✕</Text>
              </Pressable>
            </View>

            <View style={{ gap: 10 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#64748B' }}>通知類型</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {typeOptions.map((option) => {
                  const selected = type === option.id;
                  return (
                    <Pressable key={option.id} onPress={() => setType(option.id)} style={{ flex: 1, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: selected ? '#60A5FA' : '#E2E8F0', backgroundColor: selected ? '#EFF6FF' : '#FFFFFF' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        {option.id === 'alert' ? <AlertTriangle size={13} color={selected ? '#DC2626' : '#94A3B8'} /> : <Bell size={13} color={selected ? '#2563EB' : '#94A3B8'} />}
                        <Text style={{ fontSize: 14, fontWeight: '600', color: selected ? '#2563EB' : '#334155' }}>{option.label}</Text>
                      </View>
                      <Text style={{ fontSize: 10, color: '#94A3B8' }}>{option.description}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#64748B' }}>標題</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder={defaultTitle}
                placeholderTextColor="#CBD5E1"
                maxLength={40}
                style={{ width: '100%', borderRadius: 12, backgroundColor: '#F1F5F9', color: '#334155', fontSize: 15, paddingVertical: 10, paddingHorizontal: 12 }}
              />
            </View>

            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#64748B' }}>內容</Text>
              <TextInput
                value={body}
                onChangeText={setBody}
                placeholder={defaultBody}
                placeholderTextColor="#CBD5E1"
                maxLength={200}
                multiline
                textAlignVertical="top"
                style={{ width: '100%', minHeight: 84, borderRadius: 12, backgroundColor: '#F1F5F9', color: '#334155', fontSize: 15, paddingVertical: 10, paddingHorizontal: 12 }}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                disabled={!canSend}
                onPress={() => void send(false)}
                style={({ pressed }) => ({ flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: canSend ? '#2563EB' : '#E2E8F0', opacity: pressed ? 0.85 : 1, flexDirection: 'row', justifyContent: 'center', gap: 6 })}
              >
                <Bell size={16} color={canSend ? '#FFFFFF' : '#94A3B8'} />
                <Text style={{ fontSize: 14, fontWeight: '600', color: canSend ? '#FFFFFF' : '#94A3B8' }}>{sending === 'now' ? '發送中…' : '立即發送'}</Text>
              </Pressable>
              <Pressable
                disabled={!canSend}
                onPress={() => void send(true)}
                style={({ pressed }) => ({ flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: canSend ? '#F1F5F9' : '#F8FAFC', opacity: pressed ? 0.85 : 1, flexDirection: 'row', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: '#E2E8F0' })}
              >
                <Clock size={16} color={canSend ? '#475569' : '#CBD5E1'} />
                <Text style={{ fontSize: 14, fontWeight: '600', color: canSend ? '#475569' : '#CBD5E1' }}>{sending === 'scheduled' ? '排程中…' : '30 秒後'}</Text>
              </Pressable>
            </View>

            {status ? <Text style={{ fontSize: 12, color: '#94A3B8', lineHeight: 18 }}>{status}</Text> : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
