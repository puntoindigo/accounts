(() => {
  const getScript = () =>
    document.currentScript || document.querySelector('script[data-accounts-embed]');

  const script = getScript();
  if (!script) {
    return;
  }

  const targetId = script.getAttribute('data-target') || 'accounts-login-beta-01';
  const scriptSrc = script.getAttribute('src') || '';
  const fallbackBase = scriptSrc ? new URL(scriptSrc, window.location.href).origin : '';
  const baseUrl = script.getAttribute('data-accounts-base') || fallbackBase;

  const container = document.getElementById(targetId);
  if (!container || !baseUrl) {
    return;
  }

  const card = document.createElement('div');
  card.style.border = '1px solid #e2e8f0';
  card.style.borderRadius = '16px';
  card.style.padding = '20px';
  card.style.background = '#fff';
  card.style.boxShadow = '0 8px 24px rgba(15, 23, 42, 0.08)';
  card.style.fontFamily = 'system-ui, -apple-system, Segoe UI, sans-serif';

  const title = document.createElement('div');
  title.textContent = 'Acceso con Accounts';
  title.style.fontWeight = '600';
  title.style.marginBottom = '6px';
  title.style.fontSize = '16px';

  const subtitle = document.createElement('div');
  subtitle.textContent = 'Usa Google o Face Recognition para continuar.';
  subtitle.style.fontSize = '12px';
  subtitle.style.color = '#64748b';
  subtitle.style.marginBottom = '14px';

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Continuar con Accounts';
  button.style.width = '100%';
  button.style.padding = '10px 12px';
  button.style.borderRadius = '10px';
  button.style.border = '1px solid #cbd5f5';
  button.style.background = '#0f172a';
  button.style.color = '#fff';
  button.style.fontSize = '13px';
  button.style.cursor = 'pointer';

  const status = document.createElement('div');
  status.style.marginTop = '12px';
  status.style.fontSize = '12px';
  status.style.color = '#64748b';

  let popupWindow = null;
  let popupWatcher = null;

  const stopWatcher = () => {
    if (popupWatcher) {
      window.clearInterval(popupWatcher);
      popupWatcher = null;
    }
  };

  const openLogin = () => {
    const url = `${baseUrl}/embed/start?origin=${encodeURIComponent(window.location.origin)}`;
    const width = 480;
    const height = 720;
    const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
    const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);
    if (popupWindow && !popupWindow.closed) {
      popupWindow.close();
    }
    popupWindow = window.open(
      url,
      'accounts-login',
      `width=${width},height=${height},left=${left},top=${top}`
    );
    status.textContent = 'Esperando autenticación...';
    stopWatcher();
    popupWatcher = window.setInterval(() => {
      if (!popupWindow || popupWindow.closed) {
        stopWatcher();
        popupWindow = null;
        status.textContent = 'La ventana se cerró. Podés intentar nuevamente.';
      }
    }, 500);
  };

  button.addEventListener('click', openLogin);

  const sendAck = (event, receivedType) => {
    if (event.source && typeof event.source.postMessage === 'function') {
      event.source.postMessage({ type: 'accounts-ack', received: receivedType }, event.origin);
    }
  };

  window.addEventListener('message', (event) => {
    if (event.origin !== baseUrl) {
      return;
    }
    if (event.data && event.data.type === 'accounts-login') {
      status.textContent = 'Acceso validado. Continuando...';
      stopWatcher();
      if (popupWindow && !popupWindow.closed) {
        popupWindow.close();
      }
      sendAck(event, 'accounts-login');
      if (window.AccountsLoginBeta01 && typeof window.AccountsLoginBeta01.onSuccess === 'function') {
        window.AccountsLoginBeta01.onSuccess(event.data);
      }
    }
    if (event.data && event.data.type === 'accounts-error') {
      const reason = event.data.reason ? ` (${event.data.reason})` : '';
      status.textContent = `No se pudo validar el acceso${reason}. Reintentá.`;
      stopWatcher();
      if (popupWindow && !popupWindow.closed) {
        popupWindow.close();
      }
      sendAck(event, 'accounts-error');
      if (window.AccountsLoginBeta01 && typeof window.AccountsLoginBeta01.onError === 'function') {
        window.AccountsLoginBeta01.onError(event.data);
      }
    }
  });

  card.appendChild(title);
  card.appendChild(subtitle);
  card.appendChild(button);
  card.appendChild(status);
  container.appendChild(card);
})();
