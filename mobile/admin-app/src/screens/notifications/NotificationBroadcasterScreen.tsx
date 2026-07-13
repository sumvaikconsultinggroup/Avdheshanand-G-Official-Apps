import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SegmentedButtons } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import api from '../../services/api';
import { borderRadius, colors, gradients, shadows, spacing } from '../../theme';

const formatDT = (d: Date | string) =>
  new Date(d).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

const statusColor = (status: string) =>
  status === 'sent'
    ? colors.status.success
    : status === 'failed'
    ? colors.status.error
    : status === 'cancelled'
    ? colors.text.secondary
    : colors.status.warning;

type PushAudience = 'all_followers' | 'city_followers';

const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3MB cap

/** Pick an image, enforce the 3MB limit, and hand back a preview uri + data URI. */
async function pickBroadcastImage(): Promise<{ uri: string; base64: string } | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Permission needed', 'Please allow photo access to attach an image.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
    base64: true,
  });
  if (result.canceled || !result.assets?.[0]?.base64) return null;
  const asset = result.assets[0];
  const bytes = Math.ceil((asset.base64!.length * 3) / 4);
  if (bytes > MAX_IMAGE_BYTES) {
    Alert.alert('Image too large', 'Please choose an image under 3MB.');
    return null;
  }
  return { uri: asset.uri, base64: `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}` };
}

export function NotificationBroadcasterScreen() {
  const [pushAudience, setPushAudience] = useState<PushAudience>('all_followers');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [cityName, setCityName] = useState('');
  const [pushSending, setPushSending] = useState(false);

  const [pushImageUri, setPushImageUri] = useState<string | null>(null);
  const [pushImageB64, setPushImageB64] = useState<string | null>(null);

  const [volunteerCity, setVolunteerCity] = useState('');
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState<Date | null>(null);
  const [eventLocation, setEventLocation] = useState('');
  const [whatsAppMessage, setWhatsAppMessage] = useState('');
  const [whatsAppSending, setWhatsAppSending] = useState(false);
  const [waImageUri, setWaImageUri] = useState<string | null>(null);
  const [waImageB64, setWaImageB64] = useState<string | null>(null);

  const [pushSchedule, setPushSchedule] = useState<Date | null>(null);
  const [waSchedule, setWaSchedule] = useState<Date | null>(null);
  const [picker, setPicker] = useState<{ target: 'push' | 'wa' | 'eventDate'; step: 'date' | 'time'; temp: Date } | null>(null);
  const [scheduledList, setScheduledList] = useState<any[]>([]);

  const fetchScheduled = useCallback(async () => {
    try {
      const res = await api.get('/notifications/scheduled');
      setScheduledList(Array.isArray(res.data) ? res.data : []);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    fetchScheduled();
  }, [fetchScheduled]);

  const cancelScheduled = async (id: string) => {
    try {
      await api.delete(`/notifications/scheduled/${id}`);
      fetchScheduled();
    } catch {
      Alert.alert('Failed', 'Could not cancel that scheduled broadcast.');
    }
  };

  const openScheduler = (target: 'push' | 'wa' | 'eventDate') => {
    const base = new Date(Date.now() + 60 * 60 * 1000); // default +1h
    setPicker({ target, step: 'date', temp: base });
  };

  const onPickerChange = (event: any, selected?: Date) => {
    if (!picker) return;
    if (event?.type === 'dismissed' || !selected) {
      setPicker(null);
      return;
    }
    if (picker.step === 'date') {
      const temp = new Date(picker.temp);
      temp.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      setPicker({ ...picker, step: 'time', temp });
    } else {
      const final = new Date(picker.temp);
      final.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      if (picker.target === 'push') setPushSchedule(final);
      else if (picker.target === 'wa') setWaSchedule(final);
      else setEventDate(final);
      setPicker(null);
    }
  };

  const renderScheduleRow = (scheduledAt: Date | null, target: 'push' | 'wa', onClear: () => void) => (
    <TouchableOpacity style={styles.scheduleRow} onPress={() => openScheduler(target)} activeOpacity={0.85}>
      <Icon name="clock-outline" size={18} color={colors.primary.maroon} />
      <Text style={styles.scheduleText}>
        {scheduledAt ? `Scheduled: ${formatDT(scheduledAt)}` : 'Schedule for later (optional)'}
      </Text>
      {scheduledAt ? (
        <TouchableOpacity onPress={onClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="close-circle" size={18} color={colors.status.error} />
        </TouchableOpacity>
      ) : (
        <Icon name="chevron-right" size={18} color={colors.text.secondary} />
      )}
    </TouchableOpacity>
  );

  const renderImagePicker = (
    uri: string | null,
    onPicked: (img: { uri: string; base64: string } | null) => void,
    tone: string
  ) => (
    <View style={styles.imageRow}>
      {uri ? (
        <View style={styles.imagePreviewWrap}>
          <Image source={{ uri }} style={styles.imagePreview} />
          <TouchableOpacity style={styles.imageRemove} onPress={() => onPicked(null)}>
            <Icon name="close" size={13} color={colors.text.white} />
          </TouchableOpacity>
        </View>
      ) : null}
      <TouchableOpacity
        style={[styles.imageAddBtn, { borderColor: tone }]}
        onPress={async () => onPicked(await pickBroadcastImage())}
        activeOpacity={0.85}
      >
        <Icon name={uri ? 'image-edit-outline' : 'image-plus'} size={18} color={tone} />
        <Text style={[styles.imageAddText, { color: tone }]}>
          {uri ? 'Change image' : 'Attach image (≤3MB)'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const previewMessage = useMemo(() => {
    if (whatsAppMessage.trim()) return whatsAppMessage;
    return (
      `🕉️ Hari Om, Devotee 🙏\n\n` +
      `With divine blessings, you are lovingly invited to offer your seva:\n\n` +
      `📿 ${eventName || 'the upcoming event'}` +
      `${eventDate ? `\n🗓️  ${formatDT(eventDate)}` : ''}` +
      `${eventLocation ? `\n📍  ${eventLocation}` : ''}\n\n` +
      `Your presence and selfless service mean a great deal to us. Kindly confirm your availability with the Ashram team. 🌸\n\n` +
      `With gratitude & blessings,\nSwami Avdheshanand G\nTowards Divinity`
    );
  }, [eventDate, eventLocation, eventName, whatsAppMessage]);

  const sendPushBroadcast = async () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert('Missing Details', 'Please add both title and body for the push notification.');
      return;
    }

    if (pushAudience === 'city_followers' && !cityName.trim()) {
      Alert.alert('City Required', 'Please specify the city you want to target.');
      return;
    }

    try {
      setPushSending(true);
      const response = await api.post('/notifications/broadcast', {
        mode: 'push',
        title: title.trim(),
        body: body.trim(),
        audience: pushAudience,
        cityName: cityName.trim() || undefined,
        imageBase64: pushImageB64 || undefined,
        scheduledAt: pushSchedule ? pushSchedule.toISOString() : undefined,
      });

      const result = response.data;
      if (result?.scheduled) {
        Alert.alert('Scheduled', `Push scheduled for ${formatDT(result.scheduledAt)}.`);
      } else {
        Alert.alert('Broadcast Sent', `Push sent to ${result?.pushSent ?? 0} follower devices.`);
      }
      setTitle('');
      setBody('');
      setPushImageUri(null);
      setPushImageB64(null);
      setPushSchedule(null);
      if (pushAudience === 'city_followers') setCityName('');
      fetchScheduled();
    } catch (error: any) {
      console.error('Push broadcast error:', error);
      Alert.alert('Send failed', error?.response?.data?.message || 'Unable to send push notification.');
    } finally {
      setPushSending(false);
    }
  };

  const sendVolunteerWhatsApp = async () => {
    if (!volunteerCity.trim()) {
      Alert.alert('City Required', 'Please choose the volunteer city for outreach.');
      return;
    }

    if (!eventName.trim() && !whatsAppMessage.trim()) {
      Alert.alert('Message Required', 'Add either an event name or a custom WhatsApp message.');
      return;
    }

    try {
      setWhatsAppSending(true);
      const response = await api.post('/notifications/broadcast', {
        mode: 'volunteer_whatsapp',
        cityName: volunteerCity.trim(),
        eventName: eventName.trim() || undefined,
        eventDate: eventDate ? eventDate.toISOString() : undefined,
        eventLocation: eventLocation.trim() || undefined,
        message: whatsAppMessage.trim() || undefined,
        imageBase64: waImageB64 || undefined,
        scheduledAt: waSchedule ? waSchedule.toISOString() : undefined,
      });

      const result = response.data;
      if (result?.scheduled) {
        Alert.alert('Scheduled', `WhatsApp outreach scheduled for ${formatDT(result.scheduledAt)}.`);
      } else {
        const matched = result?.matchedVolunteers ?? 0;
        const sent = result?.whatsappSent ?? 0;
        const firstFailure = Array.isArray(result?.failures) && result.failures.length ? result.failures[0] : '';
        Alert.alert(
          'Volunteer Outreach',
          `Matched ${matched} volunteer(s), sent ${sent}.` +
            (sent === 0 && firstFailure ? `\n\nWhy nothing sent:\n${firstFailure}` : '')
        );
      }
      setWaImageUri(null);
      setWaImageB64(null);
      setWaSchedule(null);
      fetchScheduled();
    } catch (error: any) {
      console.error('Volunteer WhatsApp error:', error);
      Alert.alert('Send failed', error?.response?.data?.message || 'Unable to send volunteer WhatsApp broadcast.');
    } finally {
      setWhatsAppSending(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Broadcast Center</Text>
      <Text style={styles.subtitle}>Send a public push notification or rally volunteers city-wise from the same mobile screen.</Text>

      <View style={styles.card}>
        <View style={styles.cardBody}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconWrap}>
              <Icon name="bell-ring-outline" size={22} color={colors.primary.maroon} />
            </View>
            <Text style={styles.cardTitle} numberOfLines={2}>Push To Followers</Text>
          </View>
          <SegmentedButtons
            value={pushAudience}
            onValueChange={(value) => setPushAudience(value as PushAudience)}
            buttons={[
              { value: 'all_followers', label: 'All Followers' },
              { value: 'city_followers', label: 'City Followers' },
            ]}
            style={{ marginBottom: spacing.md }}
          />
          {pushAudience === 'city_followers' ? (
            <TextInput
              value={cityName}
              onChangeText={setCityName}
              placeholder="City name, e.g. Delhi"
              style={styles.input}
              placeholderTextColor={colors.text.secondary}
            />
          ) : null}
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Notification title"
            style={styles.input}
            placeholderTextColor={colors.text.secondary}
          />
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Darshan at 5 PM today / Special satsang tonight / Ashram closed due to weather"
            style={[styles.input, styles.multilineInput]}
            multiline
            placeholderTextColor={colors.text.secondary}
          />
          {renderImagePicker(
            pushImageUri,
            (img) => {
              setPushImageUri(img?.uri ?? null);
              setPushImageB64(img?.base64 ?? null);
            },
            colors.primary.maroon
          )}
          {renderScheduleRow(pushSchedule, 'push', () => setPushSchedule(null))}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={sendPushBroadcast}
            disabled={pushSending}
            style={styles.primaryButton}
          >
            <LinearGradient
              colors={gradients.maroon}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryButtonInner}
            >
              <Icon
                name={pushSending ? 'progress-clock' : pushSchedule ? 'clock-outline' : 'send'}
                size={18}
                color={colors.text.white}
              />
              <Text style={styles.primaryButtonText}>
                {pushSending ? 'Sending…' : pushSchedule ? 'Schedule Notification' : 'Send Push Notification'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardBody}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconWrap}>
              <Icon name="whatsapp" size={22} color={colors.status.success} />
            </View>
            <Text style={styles.cardTitle} numberOfLines={2}>Volunteer WhatsApp By City</Text>
          </View>
          <TextInput
            value={volunteerCity}
            onChangeText={setVolunteerCity}
            placeholder="Volunteer city, e.g. Haridwar"
            style={styles.input}
            placeholderTextColor={colors.text.secondary}
          />
          <TextInput
            value={eventName}
            onChangeText={setEventName}
            placeholder="Event / seva name"
            style={styles.input}
            placeholderTextColor={colors.text.secondary}
          />
          <TouchableOpacity
            style={[styles.input, styles.dateInput]}
            onPress={() => openScheduler('eventDate')}
            activeOpacity={0.85}
          >
            <Icon name="calendar-clock" size={18} color={colors.primary.maroon} />
            <Text style={[styles.dateInputText, !eventDate && styles.dateInputPlaceholder]}>
              {eventDate ? formatDT(eventDate) : 'Event date & time'}
            </Text>
            {eventDate ? (
              <TouchableOpacity
                onPress={() => setEventDate(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon name="close-circle" size={18} color={colors.status.error} />
              </TouchableOpacity>
            ) : (
              <Icon name="chevron-right" size={18} color={colors.text.secondary} />
            )}
          </TouchableOpacity>
          <TextInput
            value={eventLocation}
            onChangeText={setEventLocation}
            placeholder="Venue / location"
            style={styles.input}
            placeholderTextColor={colors.text.secondary}
          />
          <TextInput
            value={whatsAppMessage}
            onChangeText={setWhatsAppMessage}
            placeholder="Optional custom WhatsApp copy"
            style={[styles.input, styles.multilineInput]}
            multiline
            placeholderTextColor={colors.text.secondary}
          />
          <View style={styles.previewBox}>
            <View style={styles.previewHeader}>
              <Icon name="eye-outline" size={14} color={colors.status.success} />
              <Text style={styles.previewLabel}>Preview</Text>
            </View>
            <Text style={styles.previewText}>{previewMessage}</Text>
          </View>
          {renderImagePicker(
            waImageUri,
            (img) => {
              setWaImageUri(img?.uri ?? null);
              setWaImageB64(img?.base64 ?? null);
            },
            colors.status.success
          )}
          <Text style={styles.imageHint}>
            {waImageUri ? 'Your image will be sent with the message.' : 'Leave empty to send the Ashram logo as the header image.'}
          </Text>
          {renderScheduleRow(waSchedule, 'wa', () => setWaSchedule(null))}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={sendVolunteerWhatsApp}
            disabled={whatsAppSending}
            style={[styles.primaryButton, styles.whatsAppButton, whatsAppSending && styles.buttonDisabled]}
          >
            <Icon
              name={whatsAppSending ? 'progress-clock' : waSchedule ? 'clock-outline' : 'whatsapp'}
              size={18}
              color={colors.text.white}
            />
            <Text style={styles.primaryButtonText}>
              {whatsAppSending ? 'Sending…' : waSchedule ? 'Schedule WhatsApp' : 'Send WhatsApp'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {scheduledList.length > 0 ? (
        <View style={styles.card}>
          <View style={styles.cardBody}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconWrap}>
                <Icon name="clock-check-outline" size={22} color={colors.primary.maroon} />
              </View>
              <Text style={styles.cardTitle} numberOfLines={2}>Scheduled &amp; Recent</Text>
            </View>
            {scheduledList.map((item) => (
              <View key={item._id} style={styles.schedItem}>
                <View style={styles.schedIconWrap}>
                  <Icon
                    name={item.mode === 'push' ? 'bell-ring-outline' : 'whatsapp'}
                    size={16}
                    color={item.mode === 'push' ? colors.primary.maroon : colors.status.success}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.schedTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.schedMeta}>{formatDT(item.scheduledAt)}</Text>
                </View>
                {item.status === 'pending' ? (
                  <TouchableOpacity
                    onPress={() => cancelScheduled(item._id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Icon name="close-circle" size={22} color={colors.status.error} />
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.schedStatus, { backgroundColor: `${statusColor(item.status)}1A` }]}>
                    <Text style={[styles.schedStatusText, { color: statusColor(item.status) }]}>{item.status}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {picker ? (
        <DateTimePicker
          value={picker.temp}
          mode={picker.step}
          display="default"
          minimumDate={new Date()}
          onChange={onPickerChange}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.parchment },
  content: { padding: spacing.lg, gap: spacing.lg },
  title: { fontSize: 26, fontWeight: '700', color: colors.primary.maroon, letterSpacing: 0.2 },
  subtitle: { color: colors.text.secondary, lineHeight: 22 },
  card: {
    backgroundColor: colors.background.warmWhite,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    ...shadows.soft,
  },
  cardBody: { padding: spacing.lg },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.parchment,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
  },
  cardTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.text.primary },
  input: {
    backgroundColor: colors.background.parchment,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  multilineInput: { minHeight: 96, textAlignVertical: 'top' },
  previewBox: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: '#F3FAF4',
    borderWidth: 1,
    borderColor: 'rgba(46,158,91,0.2)',
    marginBottom: spacing.md,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.status.success,
  },
  previewText: { color: colors.text.primary, lineHeight: 22 },
  primaryButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.maroonGlow,
  },
  primaryButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  primaryButtonText: {
    color: colors.text.white,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  whatsAppButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.status.success,
    shadowColor: colors.status.success,
  },
  buttonDisabled: { opacity: 0.7 },
  imageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  imagePreviewWrap: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePreview: { width: 56, height: 56 },
  imageRemove: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageAddBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    backgroundColor: colors.background.parchment,
  },
  imageAddText: { fontSize: 13, fontWeight: '700' },
  imageHint: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background.parchment,
    borderWidth: 1,
    borderColor: colors.border.gold as string,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  scheduleText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 3,
  },
  dateInputText: {
    flex: 1,
    fontSize: 14,
    color: colors.text.primary,
  },
  dateInputPlaceholder: {
    color: colors.text.secondary,
  },
  schedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.gold as string,
  },
  schedIconWrap: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.parchment,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.gold as string,
  },
  schedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
  },
  schedMeta: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 1,
  },
  schedStatus: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  schedStatusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
});
