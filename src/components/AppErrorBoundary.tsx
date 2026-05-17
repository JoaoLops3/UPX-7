import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('AppErrorBoundary', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.screen}>
          <Text style={styles.title}>Algo deu errado</Text>
          <Text style={styles.message}>{this.state.error.message}</Text>
          <Pressable
            style={styles.btn}
            onPress={() => this.setState({ error: null })}
            accessibilityLabel="Tentar novamente"
          >
            <Text style={styles.btnText}>Tentar novamente</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.screenBg,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryVeryDark,
    marginBottom: 12,
  },
  message: {
    fontSize: 13,
    color: colors.dangerText,
    marginBottom: 20,
    lineHeight: 18,
  },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnText: { color: colors.white, fontWeight: '600', fontSize: 15 },
});
