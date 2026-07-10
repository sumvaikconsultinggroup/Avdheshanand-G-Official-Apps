import React, { useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { TextInput as PaperInput, HelperText } from 'react-native-paper';
import { useTheme } from '../../context/ThemeContext';
import { borderRadius, spacing, type ColorPalette } from '../../theme';

type KeyboardType = 'default' | 'email-address' | 'phone-pad' | 'number-pad' | 'numeric';
type AutoCap = 'none' | 'sentences' | 'words' | 'characters';

interface FloatingInputProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  /** MaterialCommunityIcons name shown on the left. */
  leftIcon?: string;
  /** Optional element on the right (e.g. a password eye toggle). */
  right?: React.ReactNode;
  placeholder?: string;
  keyboardType?: KeyboardType;
  autoCapitalize?: AutoCap;
  secureTextEntry?: boolean;
  multiline?: boolean;
  maxLength?: number;
  editable?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * App-wide floating-label text field. Built on react-native-paper's outlined
 * input (native floating label + focus/error animation) and themed to the
 * mission's gold/maroon palette in both light and dark mode.
 */
export function FloatingInput({
  label,
  value,
  onChangeText,
  error,
  leftIcon,
  right,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  secureTextEntry,
  multiline,
  maxLength,
  editable = true,
  containerStyle,
}: FloatingInputProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={[styles.wrap, containerStyle]}>
      <PaperInput
        mode="outlined"
        label={label}
        value={value}
        onChangeText={onChangeText}
        error={!!error}
        placeholder={placeholder}
        placeholderTextColor={colors.text.secondary}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        maxLength={maxLength}
        editable={editable}
        textColor={colors.text.primary}
        outlineColor={colors.border.gold as string}
        activeOutlineColor={colors.gold.main}
        outlineStyle={styles.outline}
        left={leftIcon ? <PaperInput.Icon icon={leftIcon} color={colors.gold.dark} /> : undefined}
        right={right}
        style={[styles.input, multiline && styles.multiline]}
        theme={{
          roundness: borderRadius.md,
          colors: {
            background: colors.background.warmWhite,
            surfaceVariant: colors.background.warmWhite,
            onSurfaceVariant: colors.text.secondary,
            error: colors.status.error,
            primary: colors.gold.main,
          },
        }}
      />
      {error ? (
        <HelperText type="error" visible padding="none" style={styles.helper}>
          {error}
        </HelperText>
      ) : null}
    </View>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    wrap: {
      marginBottom: spacing.md,
    },
    input: {
      backgroundColor: colors.background.warmWhite,
      fontSize: 15,
    },
    multiline: {
      minHeight: 110,
    },
    outline: {
      borderRadius: borderRadius.md,
      borderWidth: 1.5,
    },
    helper: {
      marginTop: 2,
    },
  });
