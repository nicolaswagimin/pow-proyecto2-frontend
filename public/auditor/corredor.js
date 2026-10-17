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
  // Agregado más abajo: resaltar, enfocar y clics.
  window.__a11lens = { auditar: auditar, enviar: enviar, MARCA: MARCA, SELECTOR: SELECTOR };

  window.addEventListener('message', function (evento) {
    if (evento.source !== window.parent || !evento.data) return;
    if (evento.data.tipo === 'auditar') auditar(evento.data.id);
  });

  enviar({ tipo: 'listo' });
})();
