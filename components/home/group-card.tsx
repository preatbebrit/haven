import { useRouter } from 'expo-router';
import { useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IdentityPillRow } from '@/components/home/identity-pill-row';
import { MemberRow, type MemberRowMember } from '@/components/home/member-row';
import { PrimaryNextButton } from '@/components/onboarding/primary-next-button';
import { getEffectivePromptColors, type GroupCardData } from '@/constants/mock-groups';
import { Colors, FontFamily, Radius, Spacing, TextStyle } from '@/constants/theme';
import { useCurrentUser } from '@/contexts/current-user-context';
import { useFriends } from '@/contexts/friends-context';
import { useRelationship } from '@/hooks/use-relationship';
import { useTheme } from '@/hooks/use-theme';
import { getProfileByUsername } from '@/lib/profile-directory';
import { setPromptTransitionSource } from '@/lib/prompt-transition';

function GroupCardMemberRow({ member, chatsJoined }: { member: MemberRowMember; chatsJoined: number }) {
  const { state } = useRelationship(member.handle);
  if (state === 'self') {
    return <MemberRow member={member} trailing="you-badge" />;
  }
  if (state === 'friend') {
    return <MemberRow member={member} trailing="friend-badge" />;
  }
  if (state === 'stranger') {
    return <MemberRow member={member} trailing="chats-joined" chatsJoined={chatsJoined} />;
  }
  // pending-sent / pending-received / blocked → no right-side indicator.
  return <MemberRow member={member} trailing="none" />;
}

type Props = {
  group: GroupCardData;
};

export function GroupCard({ group }: Props) {
  const router = useRouter();
  const { colors } = useTheme();
  const promptRef = useRef<View>(null);
  const promptColors = getEffectivePromptColors(group);
  const { bannedIds } = useFriends();
  const { displayProfile } = useCurrentUser();
  const visibleMembers = group.members.filter((m) => !bannedIds.has(m.id));

  // Pool = union of identityTags across the chat's members (excluding the
  // current user). Matched = pool ∩ user-tags, so highlights mean "you share
  // this with at least one other person in this chat". Matched pills are
  // sorted to the front; everything else keeps its first-seen order so
  // re-renders don't shuffle the layout.
  const identityPills = useMemo(() => {
    const userTags = new Set(displayProfile.tags);
    const pool: string[] = [];
    const seen = new Set<string>();
    for (const m of visibleMembers) {
      const profile = getProfileByUsername(m.handle);
      const tags = profile?.identityTags ?? [];
      for (const t of tags) {
        if (seen.has(t)) continue;
        seen.add(t);
        pool.push(t);
      }
    }
    const matched: string[] = [];
    const unmatched: string[] = [];
    for (const t of pool) {
      if (userTags.has(t)) matched.push(t);
      else unmatched.push(t);
    }
    return { matched, unmatched };
  }, [visibleMembers, displayProfile.tags]);

  function handleJoin() {
    const node = promptRef.current;
    if (!node) {
      router.push({ pathname: '/prompt', params: { id: group.id } });
      return;
    }
    node.measureInWindow((x, y, width, height) => {
      setPromptTransitionSource({ rect: { x, y, width, height }, groupId: group.id });
      router.push({ pathname: '/prompt', params: { id: group.id } });
    });
  }

  return (
    <View style={[styles.cardShadow, { backgroundColor: colors.backgroundPrimary }]}>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.backgroundPrimary, borderColor: colors.gray100 },
        ]}
      >

      {/* ── Prompt block ─────────────────────────────────────────────────── */}
      <Pressable
        ref={promptRef}
        style={({ pressed }) => [styles.promptBlock, { backgroundColor: promptColors.bg }, pressed && styles.promptBlockPressed]}
        onPress={handleJoin}
        accessibilityRole="button"
        accessibilityLabel="Answer prompt and join chat"
      >
        <View style={styles.promptMeta}>
          <Text style={[styles.promptLabel, { color: promptColors.fg }]}>Prompt</Text>
          <Text style={[styles.promptActive, { color: promptColors.support }]}>{group.activeLabel}</Text>
        </View>
        <Text style={[styles.promptQuestion, { color: promptColors.fg }]}>{group.question}</Text>
      </Pressable>

      {/* ── Members ──────────────────────────────────────────────────────── */}
      <View style={styles.membersSection}>
        <View style={styles.membersHeader}>
          <Text style={[styles.membersLabel, { color: colors.textPrimary }]}>Members</Text>
          <Text style={[styles.openSeats, { color: colors.textSecondary }]}>
            {group.openSeats} open seat{group.openSeats === 1 ? '' : 's'}
          </Text>
        </View>

        <View style={styles.memberList}>
          {visibleMembers.map((member) => (
            <GroupCardMemberRow
              key={member.id}
              member={member}
              chatsJoined={member.chatsJoined}
            />
          ))}
        </View>

        {/* ── Identity pills ──────────────────────────────────────────────── */}
        <IdentityPillRow
          matched={identityPills.matched}
          unmatched={identityPills.unmatched}
        />
      </View>

      {/* ── Join button ──────────────────────────────────────────────────── */}
      <View style={styles.joinWrap}>
        <PrimaryNextButton label="Join the chat" onPress={handleJoin} />
      </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Card shell ────────────────────────────────────────────────────────────
  // iOS clips shadows when overflow:hidden + borderRadius is on the same view,
  // so the shadow lives on an outer wrapper and the inner view does the clipping.
  cardShadow: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 2,
    borderColor: Colors.gray100,
    overflow: 'hidden',
  },

  // ── Prompt block ──────────────────────────────────────────────────────────
  promptBlock: {
    margin: Spacing.md,
    borderRadius: Radius.md,
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

  // ── Join button ───────────────────────────────────────────────────────────
  joinWrap: {
    padding: Spacing.md,
  },
});
