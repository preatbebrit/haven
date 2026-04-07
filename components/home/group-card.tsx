import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { GroupCardData } from '@/constants/mock-groups';
import { Colors, FontFamily, Radius, Spacing, TextStyle } from '@/constants/theme';

type Props = {
  group: GroupCardData;
};

export function GroupCard({ group }: Props) {
  const router = useRouter();

  function handleJoin() {
    router.push({ pathname: '/prompt', params: { id: group.id } });
  }

  return (
    <View style={styles.card}>

      {/* ── Prompt block ─────────────────────────────────────────────────── */}
      <Pressable
        style={({ pressed }) => [styles.promptBlock, { backgroundColor: group.promptColors.bg }, pressed && styles.promptBlockPressed]}
        onPress={handleJoin}
        accessibilityRole="button"
        accessibilityLabel="Answer prompt and join chat"
      >
        <View style={styles.promptMeta}>
          <Text style={[styles.promptLabel, { color: group.promptColors.fg }]}>Prompt</Text>
          <Text style={[styles.promptActive, { color: group.promptColors.support }]}>{group.activeLabel}</Text>
        </View>
        <Text style={[styles.promptQuestion, { color: group.promptColors.fg }]}>{group.question}</Text>
      </Pressable>

      {/* ── Members ──────────────────────────────────────────────────────── */}
      <View style={styles.membersSection}>
        <View style={styles.membersHeader}>
          <Text style={styles.membersLabel}>Members</Text>
          <Text style={styles.openSeats}>
            {group.openSeats} open seat{group.openSeats === 1 ? '' : 's'}
          </Text>
        </View>

        <View style={styles.memberList}>
          {group.members.map((member) => (
            <View key={member.id} style={styles.memberRow}>
              {/* Avatar */}
              <View style={[styles.avatar, { backgroundColor: member.avatarColor }]}>
                <Text style={styles.avatarText}>{member.handle[0].toUpperCase()}</Text>
              </View>

              {/* Handle + pronouns */}
              <View style={styles.memberInfo}>
                <Text style={styles.memberHandle}>@{member.handle} </Text>
                <Text style={styles.memberPronouns}>({member.pronouns})</Text>
              </View>

              {/* Message count + icon */}
              <View style={styles.memberCount}>
                <Text style={styles.memberCountText}>{member.messageCount}</Text>
                <Ionicons name="chatbubble-outline" size={18} color={Colors.black} />
              </View>
            </View>
          ))}
        </View>

        {/* ── Identity pills ──────────────────────────────────────────────── */}
        <View style={styles.tags}>
          {group.tags.map((tag) => (
            <View
              key={tag.label}
              style={[
                styles.tagPill,
                tag.matched ? styles.tagPillMatched : styles.tagPillUnmatched,
              ]}
            >
              <Text style={styles.tagText}>{tag.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Divider ──────────────────────────────────────────────────────── */}
      <View style={styles.divider} />

      {/* ── Join button ──────────────────────────────────────────────────── */}
      <View style={styles.joinWrap}>
        <Pressable
          style={({ pressed }) => [styles.joinButton, pressed && styles.joinButtonPressed]}
          onPress={handleJoin}
          accessibilityRole="button"
          accessibilityLabel="Join the chat"
        >
          <Text style={styles.joinLabel}>Join the chat</Text>
          <Ionicons name="arrow-forward" size={20} color={Colors.white} />
        </Pressable>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  // ── Card shell ────────────────────────────────────────────────────────────
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 2,
    borderColor: Colors.gray100,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    overflow: 'hidden',
  },

  // ── Prompt block ──────────────────────────────────────────────────────────
  promptBlock: {
    margin: Spacing.md,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    gap: 4,
  },
  promptBlockPressed: {
    opacity: 0.85,
  },
  promptMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  promptLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 16,
    lineHeight: 20,
  },
  promptActive: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    lineHeight: 16,
  },
  promptQuestion: {
    ...TextStyle.h2,
  },

  // ── Divider ───────────────────────────────────────────────────────────────
  divider: {
    height: 1,
    backgroundColor: Colors.gray100,
  },

  // ── Members ───────────────────────────────────────────────────────────────
  membersSection: {
    padding: Spacing.md,
    gap: 12,
  },
  membersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  membersLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
    lineHeight: 20,
    color: Colors.black,
  },
  openSeats: {
    fontFamily: FontFamily.extraBold,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.gray40,
    letterSpacing: -0.24,
  },
  memberList: {
    gap: Spacing.sm,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.gray100,
    borderRadius: 20,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 12,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.white,
  },
  memberInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
  },
  memberHandle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    lineHeight: 18,
    color: Colors.black,
  },
  memberPronouns: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    lineHeight: 18,
    color: Colors.black,
  },
  memberCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  memberCountText: {
    fontFamily: FontFamily.extraBold,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.black,
    letterSpacing: -0.24,
  },

  // ── Identity pills ────────────────────────────────────────────────────────
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  tagPill: {
    height: 32,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  tagPillMatched: {
    borderColor: Colors.cherry,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tagPillUnmatched: {
    borderColor: Colors.gray80,
  },
  tagText: {
    fontFamily: FontFamily.extraBold,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.black,
    letterSpacing: -0.24,
  },

  // ── Join button ───────────────────────────────────────────────────────────
  joinWrap: {
    padding: Spacing.md,
  },
  joinButton: {
    backgroundColor: Colors.black,
    borderRadius: Radius.lg,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  joinButtonPressed: {
    opacity: 0.85,
  },
  joinLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
    lineHeight: 20,
    color: Colors.white,
  },
});
