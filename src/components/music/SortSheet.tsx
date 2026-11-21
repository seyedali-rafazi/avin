import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  Clock,
  Music,
  User,
} from 'lucide-react-native';
import { BottomSheet, type SheetOption } from '@/components/ui/BottomSheet';
import { Colors, Radii, Spacing } from '@/theme';
import type { Song, SortField, SortOrder } from '@/types/music';

interface SortSheetProps {
  visible: boolean;
  onClose: () => void;
  sortBy: SortField;
  sortOrder: SortOrder;
  onSelect: (field: SortField, order: SortOrder) => void;
  title?: string;
}

const SORT_LABELS: Record<SortField, string> = {
  dateAdded: 'Time Added',
  title: 'Song Name',
  artist: 'Artist',
  duration: 'Duration',
  album: 'Album',
  playCount: 'Most Played',
};

function getOrderHint(field: SortField, order: SortOrder): string {
  if (field === 'dateAdded') {
    return order === 'desc' ? 'Newest first' : 'Oldest first';
  }
  if (field === 'duration') {
    return order === 'desc' ? 'Longest first' : 'Shortest first';
  }
  return order === 'asc' ? 'A → Z' : 'Z → A';
}

function getDefaultOrder(field: SortField): SortOrder {
  return field === 'dateAdded' || field === 'duration' ? 'desc' : 'asc';
}

export function SortSheet({
  visible,
  onClose,
  sortBy,
  sortOrder,
  onSelect,
  title = 'Sort Songs',
}: SortSheetProps) {
  const handlePick = (field: SortField) => {
    if (sortBy === field) {
      onSelect(field, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSelect(field, getDefaultOrder(field));
    }
  };

  const fields: {
    field: SortField;
    label: string;
    Icon: React.ComponentType<{ size?: number; color?: string }>;
  }[] = [
    { field: 'dateAdded', label: 'Time Added', Icon: Calendar },
    { field: 'title', label: 'Song Name', Icon: Music },
    { field: 'artist', label: 'Artist Name', Icon: User },
    { field: 'duration', label: 'Duration', Icon: Clock },
  ];

  const options: SheetOption[] = fields.map(({ field, label, Icon }) => {
    const isSelected = sortBy === field;
    const displayOrder = isSelected ? sortOrder : getDefaultOrder(field);
    return {
      label,
      selected: isSelected,
      rightText: getOrderHint(field, displayOrder),
      icon: (
        <Icon
          size={18}
          color={isSelected ? Colors.accentSecondary : Colors.textSecondary}
        />
      ),
      onPress: () => handlePick(field),
    };
  });

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      subtitle="Tap an active option to reverse order"
      options={options}
    />
  );
}

interface SortPillProps {
  sortBy: SortField;
  sortOrder: SortOrder;
  onPress: () => void;
}

export function SortPill({ sortBy, sortOrder, onPress }: SortPillProps) {
  const OrderIcon = sortOrder === 'asc' ? ArrowUp : ArrowDown;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Sorted by ${SORT_LABELS[sortBy]}, tap to change`}
    >
      <ArrowUpDown size={13} color={Colors.accentSecondary} />
      <Text style={styles.pillText}>{SORT_LABELS[sortBy]}</Text>
      <OrderIcon size={12} color={Colors.textSecondary} />
    </Pressable>
  );
}

export function sortSongsList(
  songs: Song[],
  sortBy: SortField,
  sortOrder: SortOrder
): Song[] {
  const copy = [...songs];
  const dir = sortOrder === 'asc' ? 1 : -1;
  copy.sort((a, b) => {
    switch (sortBy) {
      case 'title':
        return a.title.localeCompare(b.title) * dir;
      case 'artist':
        return a.artist.localeCompare(b.artist) * dir;
      case 'album':
        return a.album.localeCompare(b.album) * dir;
      case 'duration':
        return (a.duration - b.duration) * dir;
      case 'playCount':
        return (a.playCount - b.playCount) * dir;
      case 'dateAdded':
      default:
        return (a.dateAdded - b.dateAdded) * dir;
    }
  });
  return copy;
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  pressed: {
    opacity: 0.72,
  },
});
