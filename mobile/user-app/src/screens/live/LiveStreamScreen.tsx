import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from "react-native";
import { WebView } from "react-native-webview";
import { useTranslation } from "react-i18next";
import { type ColorPalette } from "../../theme";
import { useTheme } from "../../context/ThemeContext";
import api from "../../services/api";

const { width } = Dimensions.get("window");

interface Stream {
  _id: string;
  title: string;
  description?: string;
  youtubeVideoId: string;
  streamType: string;
  scheduledStart: string;
  isLive: boolean;
}

export default function LiveStreamScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t, i18n } = useTranslation();
  const [activeStream, setActiveStream] = useState<Stream | null>(null);
  const [upcomingStreams, setUpcomingStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const localeByLanguage: Record<string, string> = {
    en: "en-IN",
    hi: "hi-IN",
    bn: "bn-IN",
    ta: "ta-IN",
    te: "te-IN",
    mr: "mr-IN",
    gu: "gu-IN",
    kn: "kn-IN",
    ml: "ml-IN",
    pa: "pa-IN",
    or: "or-IN",
    as: "as-IN",
  };
  const dateLocale = localeByLanguage[i18n.language] || "en-IN";

  useEffect(() => {
    const fetchStreams = async () => {
      try {
        const res = await api.get("/livestream/active");
        if (res.data) {
          setActiveStream(res.data.active);
          setUpcomingStreams(res.data.upcoming || []);
        }
      } catch {
        // Handle error
      } finally {
        setLoading(false);
      }
    };
    fetchStreams();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>{t("common.loading")}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {activeStream ? (
        <View>
          <View style={styles.liveHeader}>
            <View style={styles.liveBadge}>
              <Text style={styles.liveBadgeText}>{t("live.liveBadge")}</Text>
            </View>
            <Text style={styles.streamTitle}>{activeStream.title}</Text>
          </View>

          <View style={styles.videoContainer}>
            <WebView
              source={{
                uri: `https://www.youtube.com/embed/${activeStream.youtubeVideoId}?autoplay=1&playsinline=1`,
              }}
              style={styles.video}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
            />
          </View>

          {activeStream.description && (
            <Text style={styles.description}>{activeStream.description}</Text>
          )}
        </View>
      ) : (
        <View style={styles.noStream}>
          <Text style={styles.omSymbol}>{"\u0950"}</Text>
          <Text style={styles.noStreamTitle}>{t("live.noStreamTitle")}</Text>
          <Text style={styles.noStreamSub}>
            {t("live.noStreamSubtitle")}
          </Text>
        </View>
      )}

      {upcomingStreams.length > 0 && (
        <View style={styles.upcomingSection}>
          <Text style={styles.sectionTitle}>{t("live.upcomingStreams")}</Text>
          {upcomingStreams.map((stream) => (
            <View key={stream._id} style={styles.upcomingCard}>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>{stream.streamType}</Text>
              </View>
              <Text style={styles.upcomingTitle}>{stream.title}</Text>
              <Text style={styles.upcomingDate}>
                {new Date(stream.scheduledStart).toLocaleString(dateLocale, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFDF5" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { color: "#999" },
  liveHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  liveBadge: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveBadgeText: { color: "#FFF", fontSize: 11, fontWeight: "700" },
  streamTitle: { fontSize: 18, fontWeight: "700", color: "#800020", flex: 1 },
  videoContainer: {
    width: width,
    height: (width * 9) / 16,
    backgroundColor: "#000",
  },
  video: { flex: 1 },
  description: {
    paddingHorizontal: 16,
    paddingTop: 12,
    color: "#666",
    fontSize: 14,
    lineHeight: 22,
  },
  noStream: { paddingVertical: 80, alignItems: "center" },
  omSymbol: { fontSize: 60, color: "rgba(255,107,0,0.2)" },
  noStreamTitle: { fontSize: 20, fontWeight: "700", color: "#800020", marginTop: 8 },
  noStreamSub: { fontSize: 14, color: "#999", marginTop: 4 },
  upcomingSection: { padding: 16, marginTop: 16 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#800020",
    marginBottom: 12,
  },
  upcomingCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#F5E6CC",
  },
  typeBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,107,0,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  typeBadgeText: { fontSize: 11, color: colors.primary.saffron },
  upcomingTitle: { fontSize: 15, fontWeight: "600", color: "#800020", marginTop: 6 },
  upcomingDate: { fontSize: 12, color: "#999", marginTop: 4 },
});
