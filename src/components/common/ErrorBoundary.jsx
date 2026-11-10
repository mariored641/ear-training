import React from 'react';
import i18n from '../../i18n';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled error in app tree:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          padding: '2rem',
          textAlign: 'center',
          color: '#f3e9d2',
        }}>
          <p>{i18n.t('common.somethingWentWrong')}</p>
          <button onClick={this.handleReload}>{i18n.t('common.refresh')}</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
