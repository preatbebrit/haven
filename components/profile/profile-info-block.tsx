import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { EditIcon } from '@/components/ui/icons/edit-icon';
import { IdentityPill } from '@/components/ui/identity-pill';
import { Colors, FontFamily, FontSize, Spacing, TextStyle } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const addFriendCircle = require('@/assets/images/icon-add-friend-circle.png');

type Props = {
  handle: string;
  pronouns: string;
  tags?: string[];
  /** `null` = not yet loaded; `""` = explicitly empty; otherwise the bio text. */
  bio: string | null;
  /** When true, tapping the bio enters an inline edit mode. */
  editable?: boolean;
  /** Required when `editable` is true. */
  onSubmitBio?: (next: string) => void;
};

export function ProfileInfoBlock({
  handle,
  pronouns,
  tags,
  bio,
  editable = false,
  onSubmitBio,
}: Props) {
  const { colors } = useTheme();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  function beginEdit() {
    if (!editable) return;
    setDraft(bio ?? '');
    setEditing(true);
  }

  function commitEdit() {
    setEditing(false);
    onSubmitBio?.(draft.trim());
  }

  return (
    <View style={styles.profileInfo}>
      <View style={styles.nameRow}>
        <Text style={[styles.handle, { color: colors.textPrimary }]}>@{handle}</Text>
        {pronouns ? <Text style={[styles.pronouns, { color: colors.textSecondary }]}> ({pronouns})</Text> : null}
      </View>

      {tags && tags.length > 0 ? (
        <View style={styles.tagsList}>
          {tags.map((tag) => (
            <IdentityPill key={tag} label={tag} />
          ))}
        </View>
      ) : null}

      <View style={styles.bioWrap}>
        {bio === null ? (
          // Reserve space while bio loads so the "Add a Bio" button (or bio
          // text) doesn't shift content below it when it appears.
          <View style={styles.bioPlaceholder} />
        ) : editing && editable ? (
          <TextInput
            style={[styles.bioInput, { color: colors.textPrimary }]}
            value={draft}
            onChangeText={setDraft}
            onBlur={commitEdit}
            onSubmitEditing={commitEdit}
            placeholder="Write a short bio..."
            placeholderTextColor={Colors.gray60}
            maxLength={150}
            multiline
            autoFocus
            blurOnSubmit
            accessibilityLabel="Bio"
          />
        ) : bio.length > 0 ? (
          editable ? (
            <Pressable
              style={styles.bioTextRow}
              onPress={beginEdit}
              accessibilityRole="button"
              accessibilityLabel="Edit bio"
            >
              <Text style={[styles.bioText, { color: colors.textSecondary }]}>{bio}</Text>
              <EditIcon size={18} color={colors.textPrimary} />
            </Pressable>
          ) : (
            <Text style={[styles.bioText, { color: colors.textSecondary }]}>{bio}</Text>
          )
        ) : editable ? (
          <Pressable
            style={({ pressed }) => [
              styles.addBioBtn,
              { borderColor: colors.gray100 },
              pressed && { opacity: 0.7 },
            ]}
            onPress={beginEdit}
            accessibilityRole="button"
            accessibilityLabel="Add a bio"
          >
            <View style={styles.addBioIcon}>
              <Image source={addFriendCircle} style={styles.addBioIcon} />
              <View style={styles.addBioPlusWrap}>
                <Ionicons name="add" size={13} color={colors.textSecondary} />
              </View>
            </View>
            <Text style={[styles.addBioLabel, { color: colors.textPrimary }]}>Add a Bio</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  profileInfo: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  handle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xl,
    lineHeight: 32,
    letterSpacing: -0.96,
    color: Colors.black,
  },
  pronouns: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
    lineHeight: 20,
    color: Colors.gray40,
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingVertical: 2,
  },
  bioWrap: {
    marginTop: Spacing.xs,
  },
  bioPlaceholder: {
    // Matches the "Add a Bio" button height: 24 (icon) + 2*10 (vPad) + 2*2 (border)
    height: 48,
  },
  bioTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  bioText: {
    ...TextStyle.body,
    color: Colors.gray40,
    flexShrink: 1,
  },
  bioInput: {
    ...TextStyle.body,
    color: Colors.black,
    padding: 0,
    margin: 0,
    minHeight: 20,
  },
  addBioBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.gray100,
  },
  addBioIcon: {
    width: 24,
    height: 24,
  },
  addBioPlusWrap: {
    position: 'absolute',
    top: 5.67,
    left: 5.6,
    width: 12.875,
    height: 12.875,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-5deg' }],
  },
  addBioLabel: {
    fontFamily: FontFamily.extraBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.24,
    color: Colors.black,
  },
});
