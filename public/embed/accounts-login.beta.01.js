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
  card.style.padding = '18px';
  card.style.background = '#fff';
  card.style.boxShadow = '0 8px 24px rgba(15, 23, 42, 0.08)';
  card.style.fontFamily = 'system-ui, -apple-system, Segoe UI, sans-serif';

  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.justifyContent = 'space-between';
  header.style.marginBottom = '10px';

  const title = document.createElement('div');
  title.textContent = 'Acceso con Accounts';
  title.style.fontWeight = '600';
  title.style.fontSize = '15px';
  title.style.color = '#0f1419';

  const accountsLink = document.createElement('a');
  accountsLink.href = baseUrl;
  accountsLink.target = '_blank';
  accountsLink.rel = 'noreferrer';
  accountsLink.textContent = 'Accounts';
  accountsLink.style.fontSize = '12px';
  accountsLink.style.color = '#64748b';
  accountsLink.style.textDecoration = 'underline';
  accountsLink.style.textUnderlineOffset = '4px';

  header.appendChild(title);
  header.appendChild(accountsLink);

  const subtitle = document.createElement('div');
  subtitle.textContent = 'Elegí un método para validar identidad.';
  subtitle.style.fontSize = '12px';
  subtitle.style.color = '#64748b';
  subtitle.style.marginBottom = '12px';

  const tabs = document.createElement('div');
  tabs.style.display = 'flex';
  tabs.style.gap = '8px';
  tabs.style.marginBottom = '12px';

  const content = document.createElement('div');
  content.style.border = '1px solid #e2e8f0';
  content.style.borderRadius = '12px';
  content.style.padding = '12px';
  content.style.background = '#f8fafc';

  const status = document.createElement('div');
  status.style.marginTop = '10px';
  status.style.fontSize = '12px';
  status.style.color = '#64748b';

  const methods = [
    {
      id: 'google',
      label: 'Google',
      description: 'Validación con cuenta de Google autorizada.',
      icon: '<svg width="16" height="16" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.44 0 6.5 1.18 8.92 3.12l6.66-6.66C35.54 2.36 30.08 0 24 0 14.62 0 6.54 5.38 2.54 13.22l7.76 6.02C12.1 13.02 17.6 9.5 24 9.5z"/><path fill="#34A853" d="M46.98 24.56c0-1.58-.14-3.1-.4-4.56H24v9.1h12.98c-.56 2.98-2.24 5.5-4.76 7.2l7.32 5.66c4.28-3.94 6.44-9.74 6.44-17.4z"/><path fill="#4A90E2" d="M10.3 28.86a14.5 14.5 0 0 1 0-9.72l-7.76-6.02A23.96 23.96 0 0 0 0 24c0 3.9.94 7.58 2.54 10.88l7.76-6.02z"/><path fill="#FBBC05" d="M24 48c6.48 0 11.92-2.14 15.88-5.8l-7.32-5.66c-2.02 1.36-4.6 2.16-8.56 2.16-6.4 0-11.9-3.52-13.7-9.74l-7.76 6.02C6.54 42.62 14.62 48 24 48z"/></svg>'
    },
    {
      id: 'face',
      label: 'FR',
      description: 'Validación con reconocimiento facial.',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="#0f1419"><path d="M5 7a2 2 0 0 1 2-2h2V3H7a4 4 0 0 0-4 4v2h2V7zm12-4h-2v2h2a2 2 0 0 1 2 2v2h2V7a4 4 0 0 0-4-4zm2 14a2 2 0 0 1-2 2h-2v2h2a4 4 0 0 0 4-4v-2h-2v2zM5 17v-2H3v2a4 4 0 0 0 4 4h2v-2H7a2 2 0 0 1-2-2zm3-6a4 4 0 1 0 8 0 4 4 0 0 0-8 0zm2 0a2 2 0 1 1 4 0 2 2 0 0 1-4 0z"/></svg>'
    }
  ];

  let popupWindow = null;
  let popupWatcher = null;

  const stopWatcher = () => {
    if (popupWatcher) {
      window.clearInterval(popupWatcher);
      popupWatcher = null;
    }
  };

  const openLogin = (method) => {
    const url = `${baseUrl}/embed/start?origin=${encodeURIComponent(window.location.origin)}`;
    const finalUrl = method ? `${url}&method=${encodeURIComponent(method)}` : url;
    const width = 480;
    const height = 720;
    const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
    const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);
    if (popupWindow && !popupWindow.closed) {
      popupWindow.close();
    }
    popupWindow = window.open(
      finalUrl,
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

  let activeMethod = 'google';

  const renderContent = () => {
    const method = methods.find(item => item.id === activeMethod);
    if (!method) {
      return;
    }
    content.innerHTML = '';

    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = '8px';
    row.style.marginBottom = '8px';

    const iconWrapper = document.createElement('span');
    iconWrapper.innerHTML = method.icon;

    const label = document.createElement('span');
    label.textContent = method.label;
    label.style.fontWeight = '600';
    label.style.fontSize = '13px';
    label.style.color = '#0f1419';

    row.appendChild(iconWrapper);
    row.appendChild(label);

    const desc = document.createElement('div');
    desc.textContent = method.description;
    desc.style.fontSize = '12px';
    desc.style.color = '#64748b';
    desc.style.marginBottom = '10px';

    const action = document.createElement('button');
    action.type = 'button';
    action.textContent = method.id === 'google' ? 'Validar con Google' : 'Validar con FR';
    action.style.width = '100%';
    action.style.padding = '9px 12px';
    action.style.borderRadius = '10px';
    action.style.border = '1px solid #cbd5f5';
    action.style.background = '#0f172a';
    action.style.color = '#fff';
    action.style.fontSize = '13px';
    action.style.cursor = 'pointer';
    action.addEventListener('click', () => openLogin(method.id));

    content.appendChild(row);
    content.appendChild(desc);
    content.appendChild(action);
  };

  methods.forEach(method => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.style.display = 'flex';
    tab.style.alignItems = 'center';
    tab.style.gap = '6px';
    tab.style.padding = '6px 10px';
    tab.style.borderRadius = '999px';
    tab.style.border = '1px solid #e2e8f0';
    tab.style.background = 'white';
    tab.style.fontSize = '12px';
    tab.style.cursor = 'pointer';
    tab.style.color = '#0f1419';
    tab.innerHTML = `${method.icon}<span>${method.label}</span>`;
    tab.addEventListener('click', () => {
      activeMethod = method.id;
      Array.from(tabs.children).forEach(child => {
        child.style.background = 'white';
        child.style.borderColor = '#e2e8f0';
        child.style.color = '#0f1419';
        child.querySelectorAll('path').forEach(path => {
          path.setAttribute('fill', '#0f1419');
        });
      });
      tab.style.background = '#0f172a';
      tab.style.borderColor = '#0f172a';
      tab.style.color = '#fff';
      tab.querySelectorAll('path').forEach(path => {
        path.setAttribute('fill', '#fff');
      });
      renderContent();
    });
    tabs.appendChild(tab);
  });

  if (tabs.children[0]) {
    tabs.children[0].style.background = '#0f172a';
    tabs.children[0].style.borderColor = '#0f172a';
    tabs.children[0].style.color = '#fff';
    tabs.children[0].querySelectorAll('path').forEach(path => {
      path.setAttribute('fill', '#fff');
    });
  }
  renderContent();

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

  card.appendChild(header);
  card.appendChild(subtitle);
  card.appendChild(tabs);
  card.appendChild(content);
  card.appendChild(status);
  container.appendChild(card);
})();
