// Corredor de a11Lens. Corre DENTRO del iframe aislado (sandbox="allow-scripts", origen opaco),
// junto con axe-core, cargados con el nonce de la CSP. Ningún otro script de la página corre.
// Solo habla con la ventana padre por postMessage. Protocolo en docs/lente.md.
(function () {
  'use strict';

  var guion = document.currentScript;
  var esFragmento = guion && guion.dataset.fragmento === 'si';
  var ETIQUETAS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
  // En un fragmento (HTML pegado sin <html>) no tiene sentido exigir idioma, título ni regiones.
  var REGLAS_DE_DOCUMENTO = ['html-has-lang', 'html-lang-valid', 'document-title', 'landmark-one-main', 'page-has-heading-one', 'region', 'bypass'];
  var MARCA = 'data-a11lens-marca';
  var SELECTOR = 'data-a11lens-selector';

  function enviar(mensaje) {
    window.parent.postMessage(mensaje, '*');
  }

  function soloDatos(v) {
    return {
      id: v.id,
      impact: v.impact,
      help: v.help,
      helpUrl: v.helpUrl,
      tags: v.tags,
      nodes: v.nodes.map(function (n) {
        return { target: n.target, html: n.html };
      }),
    };
  }

  function auditar(id) {
    var reglas = {};
    if (esFragmento) {
      REGLAS_DE_DOCUMENTO.forEach(function (r) {
        reglas[r] = { enabled: false };
      });
    }
    window.axe
      .run({ exclude: [['[data-a11lens]']] }, { runOnly: { type: 'tag', values: ETIQUETAS }, rules: reglas })
      .then(function (r) {
        enviar({ tipo: 'resultado', id: id, violaciones: r.violations.map(soloDatos), aprobadas: r.passes.length });
      })
      .catch(function (e) {
        enviar({ tipo: 'error', id: id, mensaje: String(e && e.message) });
      });
  }
  // ---------- Lente ----------
  // Los resaltados son un atributo + un <style> propio (data-a11lens), no elementos nuevos: así
  // no alteran el layout de la página.
  function estilos() {
    if (document.querySelector('style[data-a11lens]')) return;
    var estilo = document.createElement('style');
    estilo.setAttribute('data-a11lens', '');
    estilo.setAttribute('nonce', guion ? guion.nonce : '');
    estilo.textContent =
      '[' + MARCA + ']{outline:3px solid #ffe14d!important;outline-offset:2px!important;' +
      'box-shadow:0 0 0 5px #15161e!important;cursor:pointer!important}' +
      '[' + MARCA + '="seleccionado"]{outline:5px solid #ffe14d!important;' +
      'box-shadow:0 0 0 9px #b42318!important}';
    document.head.appendChild(estilo);
  }

  function buscar(selector) {
    if (!selector || selector.indexOf(' >> ') !== -1) return null; // dentro de iframes o shadow DOM
    try {
      return document.querySelector(selector);
    } catch (e) {
      return null;
    }
  }

  function resaltar(selectores, seleccionado) {
    estilos();
    document.querySelectorAll('[' + MARCA + ']').forEach(function (el) {
      el.removeAttribute(MARCA);
      el.removeAttribute(SELECTOR);
    });
    selectores.forEach(function (selector) {
      var el = buscar(selector);
      // El documento entero (html, head, body) no se contornea: no ayuda a ubicar nada.
      if (!el || el === document.documentElement || el === document.head || el === document.body) return;
      el.setAttribute(MARCA, selector === seleccionado ? 'seleccionado' : 'problema');
      el.setAttribute(SELECTOR, selector);
    });
  }

  function enfocar(selector) {
    var el = buscar(selector);
    if (!el) return;
    document.querySelectorAll('[' + MARCA + '="seleccionado"]').forEach(function (otro) {
      otro.setAttribute(MARCA, 'problema');
    });
    el.setAttribute(MARCA, 'seleccionado');
    el.scrollIntoView({ block: 'center', inline: 'nearest' });
  }

  // La vista previa no navega ni envía nada: cualquier clic se detiene. Si es sobre un elemento
  // con problemas, se avisa a la app para seleccionar su problema.
  document.addEventListener(
    'click',
    function (evento) {
      evento.preventDefault();
      var marcado = evento.target.closest && evento.target.closest('[' + SELECTOR + ']');
      if (marcado) enviar({ tipo: 'clic', selector: marcado.getAttribute(SELECTOR) });
    },
    true,
  );
  document.addEventListener('submit', function (evento) {
    evento.preventDefault();
  }, true);

  window.addEventListener('message', function (evento) {
    if (evento.source !== window.parent || !evento.data) return;
    var m = evento.data;
    if (m.tipo === 'auditar') auditar(m.id);
    else if (m.tipo === 'resaltar') resaltar(m.selectores || [], m.seleccionado);
    else if (m.tipo === 'enfocar') enfocar(m.selector);
  });

  enviar({ tipo: 'listo' });
})();
