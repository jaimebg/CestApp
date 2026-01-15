import { View, Text, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Input, Badge, Skeleton, SkeletonText, SkeletonCard } from '@/src/components/ui';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      className="flex-1 bg-background dark:bg-background-dark"
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 32 }}
    >
      <View className="px-6 pt-4">
        <Text className="text-3xl text-text dark:text-text-dark" style={{ fontFamily: 'Inter_700Bold' }}>
          UI Components
        </Text>
        <Text className="text-base text-text-secondary dark:text-text-dark-secondary mt-2" style={{ fontFamily: 'Inter_400Regular' }}>
          Component library showcase
        </Text>

        {/* Buttons Section */}
        <Text className="text-lg text-text dark:text-text-dark mt-8 mb-4" style={{ fontFamily: 'Inter_600SemiBold' }}>
          Buttons
        </Text>

        <View className="gap-3">
          <Button variant="primary" size="lg">
            Primary Large
          </Button>
          <Button variant="primary" size="md">
            Primary Medium
          </Button>
          <Button variant="primary" size="sm">
            Primary Small
          </Button>
          <Button variant="secondary" size="md">
            Secondary
          </Button>
          <Button variant="ghost" size="md">
            Ghost
          </Button>
          <Button variant="destructive" size="md">
            Destructive
          </Button>
          <Button variant="primary" size="md" loading>
            Loading...
          </Button>
          <Button
            variant="primary"
            size="md"
            leftIcon={<Ionicons name="camera-outline" size={20} color="#FFFFFF" />}
          >
            With Icon
          </Button>
        </View>

        {/* Cards Section */}
        <Text className="text-lg text-text dark:text-text-dark mt-8 mb-4" style={{ fontFamily: 'Inter_600SemiBold' }}>
          Cards
        </Text>

        <View className="gap-4">
          <Card variant="elevated" padding="lg">
            <Text className="text-base text-text dark:text-text-dark" style={{ fontFamily: 'Inter_500Medium' }}>
              Elevated Card
            </Text>
            <Text className="text-sm text-text-secondary dark:text-text-dark-secondary mt-1" style={{ fontFamily: 'Inter_400Regular' }}>
              With shadow effect
            </Text>
          </Card>

          <Card variant="outlined" padding="lg">
            <Text className="text-base text-text dark:text-text-dark" style={{ fontFamily: 'Inter_500Medium' }}>
              Outlined Card
            </Text>
            <Text className="text-sm text-text-secondary dark:text-text-dark-secondary mt-1" style={{ fontFamily: 'Inter_400Regular' }}>
              With border
            </Text>
          </Card>

          <Card variant="filled" padding="lg">
            <Text className="text-base text-text dark:text-text-dark" style={{ fontFamily: 'Inter_500Medium' }}>
              Filled Card
            </Text>
            <Text className="text-sm text-text-secondary dark:text-text-dark-secondary mt-1" style={{ fontFamily: 'Inter_400Regular' }}>
              With background color
            </Text>
          </Card>

          <Card variant="outlined" padding="lg" onPress={() => {}}>
            <Text className="text-base text-text dark:text-text-dark" style={{ fontFamily: 'Inter_500Medium' }}>
              Pressable Card
            </Text>
            <Text className="text-sm text-text-secondary dark:text-text-dark-secondary mt-1" style={{ fontFamily: 'Inter_400Regular' }}>
              Tap me!
            </Text>
          </Card>
        </View>

        {/* Badges Section */}
        <Text className="text-lg text-text dark:text-text-dark mt-8 mb-4" style={{ fontFamily: 'Inter_600SemiBold' }}>
          Badges
        </Text>

        <View className="flex-row flex-wrap gap-2">
          <Badge variant="default" label="Default" />
          <Badge variant="success" label="Success" />
          <Badge variant="warning" label="Warning" />
          <Badge variant="error" label="Error" />
          <Badge variant="info" label="Info" />
        </View>

        <View className="flex-row flex-wrap gap-2 mt-3">
          <Badge variant="success" size="sm" label="Small" />
          <Badge variant="success" size="md" label="Medium" />
        </View>

        {/* Input Section */}
        <Text className="text-lg text-text dark:text-text-dark mt-8 mb-4" style={{ fontFamily: 'Inter_600SemiBold' }}>
          Inputs
        </Text>

        <View className="gap-4">
          <Input
            label="Basic Input"
            placeholder="Enter text..."
          />
          <Input
            label="With Left Icon"
            placeholder="Search..."
            leftIcon={<Ionicons name="search-outline" size={20} color="#8D8680" />}
          />
          <Input
            label="With Error"
            placeholder="Enter email..."
            error="Please enter a valid email"
          />
        </View>

        {/* Skeleton Section */}
        <Text className="text-lg text-text dark:text-text-dark mt-8 mb-4" style={{ fontFamily: 'Inter_600SemiBold' }}>
          Skeletons
        </Text>

        <View className="gap-4">
          <View>
            <Text className="text-sm text-text-secondary dark:text-text-dark-secondary mb-2" style={{ fontFamily: 'Inter_400Regular' }}>
              Basic shapes:
            </Text>
            <View className="flex-row gap-3 items-center">
              <Skeleton width={60} height={60} borderRadius={30} />
              <Skeleton width={100} height={20} borderRadius={4} />
              <Skeleton width={80} height={32} borderRadius={8} />
            </View>
          </View>

          <View>
            <Text className="text-sm text-text-secondary dark:text-text-dark-secondary mb-2" style={{ fontFamily: 'Inter_400Regular' }}>
              Text skeleton:
            </Text>
            <SkeletonText lines={3} />
          </View>

          <View>
            <Text className="text-sm text-text-secondary dark:text-text-dark-secondary mb-2" style={{ fontFamily: 'Inter_400Regular' }}>
              Card skeleton:
            </Text>
            <SkeletonCard />
          </View>
        </View>

        {/* Color Palette */}
        <Text className="text-lg text-text dark:text-text-dark mt-8 mb-4" style={{ fontFamily: 'Inter_600SemiBold' }}>
          Color Palette
        </Text>

        <View className="flex-row flex-wrap gap-3">
          <View className="items-center">
            <View className="w-16 h-16 rounded-xl bg-cream border border-border" />
            <Text className="text-xs text-text-secondary mt-1" style={{ fontFamily: 'Inter_400Regular' }}>Cream</Text>
          </View>
          <View className="items-center">
            <View className="w-16 h-16 rounded-xl bg-golden" />
            <Text className="text-xs text-text-secondary mt-1" style={{ fontFamily: 'Inter_400Regular' }}>Golden</Text>
          </View>
          <View className="items-center">
            <View className="w-16 h-16 rounded-xl bg-fresh" />
            <Text className="text-xs text-text-secondary mt-1" style={{ fontFamily: 'Inter_400Regular' }}>Fresh</Text>
          </View>
          <View className="items-center">
            <View className="w-16 h-16 rounded-xl bg-burgundy" />
            <Text className="text-xs text-text-secondary mt-1" style={{ fontFamily: 'Inter_400Regular' }}>Burgundy</Text>
          </View>
          <View className="items-center">
            <View className="w-16 h-16 rounded-xl bg-primary-deep" />
            <Text className="text-xs text-text-secondary mt-1" style={{ fontFamily: 'Inter_400Regular' }}>Primary</Text>
          </View>
        </View>

      </View>
    </ScrollView>
  );
}
