import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { GroupCardData } from '@/constants/mock-groups';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';

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
      <View style={[styles.promptHeader, { backgroundColor: group.headerBackground }]}>
        <View style={styles.promptMetaRow}>
          <Text style={styles.promptMetaLeft}>Prompt</Text>
          <Text style={styles.promptMetaRight}>{group.activeLabel}</Text>
        </View>
        <Text style={[styles.question, { color: group.questionColor }]}>{group.question}</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.membersHeaderRow}>
          <Text style={styles.sectionLabel}>Members</Text>
          <Text style={styles.openSeats}>
            {group.openSeats} open seat{group.openSeats === 1 ? '' : 's'}
          </Text>
        </View>

        <View style={styles.memberList}>
          {group.members.map((member) => (
            <View key={member.id} style={styles.memberRow}>
              <View style={[styles.avatar, { backgroundColor: member.avatarColor }]}>
                <Ionicons name="person" size={16} color={Colors.white} />
              </View>
              <Text style={styles.handle} numberOfLines={1}>
                @{member.handle}
              </Text>
              {member.isNew ? (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>New!</Text>
                </View>
              ) : null}
              <Ionicons name="add" size={22} color={Colors.black} style={styles.memberPlus} />
              <View style={styles.memberSpacer} />
              <Text style={styles.messageCount}>{member.messageCount}</Text>
              <Ionicons name="chatbubble-outline" size={18} color={Colors.black} />
            </View>
          ))}
        </View>

        <View style={styles.tags}>
          {group.tags.map((tag) => (
            <View key={tag} style={styles.tagPill}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [styles.joinButton, pressed && styles.joinButtonPressed]}
          onPress={handleJoin}
        >
          <Text style={styles.joinLabel}>Join the chat</Text>
          <Ionicons name="arrow-forward" size={22} color={Colors.white} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },
  promptHeader: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  promptMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  promptMetaLeft: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.white,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    opacity: 0.95,
  },
  promptMetaRight: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.white,
    opacity: 0.9,
  },
  question: {
    fontFamily: FontFamily.extraBold,
    fontSize: FontSize.xxl,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  body: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  membersHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.black,
  },
  openSeats: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.gray40,
  },
  memberList: {
    gap: Spacing.sm,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    flex: 1,
    minWidth: 0,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: Colors.black,
  },
  memberPlus: {
    marginLeft: 2,
  },
  memberSpacer: {
    flex: 1,
    minWidth: Spacing.xs,
  },
  messageCount: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.black,
    marginRight: 4,
  },
  newBadge: {
    marginLeft: Spacing.xs,
    backgroundColor: '#39ff14',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  newBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: Colors.black,
    letterSpacing: 0.3,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  tagPill: {
    borderWidth: 1.5,
    borderColor: Colors.black,
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  tagText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.black,
  },
  joinButton: {
    marginTop: Spacing.xs,
    backgroundColor: Colors.black,
    borderRadius: Radius.full,
    height: 56,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  joinButtonPressed: {
    opacity: 0.85,
  },
  joinLabel: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.white,
    letterSpacing: 0.2,
  },
});
