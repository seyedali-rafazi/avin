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
import { Colors, Fonts, Radii } from '@/theme';
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
  dateAdded: 'زمان افزودن',
  title: 'نام آهنگ',
  artist: 'هنرمند',
  duration: 'مدت زمان',
  album: 'آلبوم',
  playCount: 'پربازدیدترین',
};

function getOrderHint(field: SortField, order: SortOrder): string {
  if (field === 'dateAdded') {
    return order === 'desc' ? 'جدیدترین' : 'قدیمی‌ترین';
  }
  if (field === 'duration') {
    return order === 'desc' ? 'بلندترین' : 'کوتاه‌ترین';
  }
  return order === 'asc' ? 'الف تا ی' : 'ی تا الف';
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
  title = 'مرتب‌سازی آهنگ‌ها',
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
    { field: 'dateAdded', label: 'زمان افزودن', Icon: Calendar },
    { field: 'title', label: 'نام آهنگ', Icon: Music },
    { field: 'artist', label: 'نام هنرمند', Icon: User },
    { field: 'duration', label: 'مدت زمان', Icon: Clock },
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
      subtitle="برای تغییر جهت مرتب‌سازی دوباره ضربه بزنید"
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
      accessibilityLabel={`مرتب‌سازی بر اساس ${SORT_LABELS[sortBy]}`}
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
        return a.title.localeCompare(b.title, 'fa') * dir;
      case 'artist':
        return a.artist.localeCompare(b.artist, 'fa') * dir;
      case 'album':
        return a.album.localeCompare(b.album, 'fa') * dir;
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
    paddingVertical: 6,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillText: {
    fontFamily: Fonts.semiBold,
    fontSize: 11.5,
    lineHeight: 18,
    color: Colors.textPrimary,
  },
  pressed: {
    opacity: 0.72,
  },
});
