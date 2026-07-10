import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { borderRadius, spacing, typography, type ColorPalette } from "../../theme";
import { useTheme } from "../../context/ThemeContext";
import api from "../../services/api";
import { SurfaceCard } from "../../components/common";

interface Vichar {
  titleHindi: string;
  titleEnglish: string;
  contentHindi: string;
  contentEnglish: string;
  source?: string;
  date: string;
}

export default function DailyVicharCard() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [vichar, setVichar] = useState<Vichar | null>(null);

  const preferredLanguage = useMemo<"hindi" | "english">(() => {
    return i18n.language?.startsWith("hi") ? "hindi" : "english";
  }, [i18n.language]);

  useEffect(() => {
    const fetchVichar = async () => {
      try {
        const res = await api.get("/daily-vichar/today");
        setVichar(res.data);
      } catch {
        // Silently fail
      }
    };
    fetchVichar();
  }, []);

  if (!vichar) return null;

  return (
    <SurfaceCard style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{t("home.dailyVicharLabel")}</Text>
        <Text style={styles.languageTag}>
          {preferredLanguage === "english" ? t("home.languageEnglish") : t("home.languageHindi")}
        </Text>
      </View>

      <Text style={styles.title}>
        {preferredLanguage === "hindi" ? vichar.titleHindi : vichar.titleEnglish}
      </Text>
      <Text style={styles.content}>
        {"\u201C"}{preferredLanguage === "hindi" ? vichar.contentHindi : vichar.contentEnglish}
        {"\u201D"}
      </Text>
      {vichar.source && <Text style={styles.source}>{"\u2014"} {vichar.source}</Text>}
    </SurfaceCard>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  label: {
    ...typography.label,
    color: colors.primary.saffron,
  },
  languageTag: {
    ...typography.caption,
    color: colors.gold.dark,
    fontWeight: "600",
    backgroundColor: colors.background.cream,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  title: {
    ...typography.h3,
    color: colors.primary.maroon,
    marginBottom: 8,
  },
  content: {
    ...typography.body,
    color: colors.text.primary,
    fontStyle: "italic",
  },
  source: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 8,
    textAlign: "right",
  },
});
