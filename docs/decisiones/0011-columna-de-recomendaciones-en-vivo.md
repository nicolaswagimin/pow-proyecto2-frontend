# 0011 · La columna derecha de /app habla de la página auditada

- **Estado:** aceptada · **Fecha:** 2026-10-17

## Contexto
En `/app`, la columna derecha (el mejor espacio de la pantalla) tenía el panel «Anotaciones». Ese panel anota los controles de **a11Lens** al enfocarlos: tiene sentido en el acceso y en `/design`, donde la app se muestra a sí misma, pero no mientras la persona revisa otra página. Con un resultado en pantalla, ocupaba la columna hablando de otra cosa.

## Decisión
1. **Fuera de `/app`.** «Anotaciones» (`app-margen`) y la autoauditoría móvil salen de `/app`. Siguen en login, registro y `/design`, sin cambios.
2. **La columna es `ui-recomendaciones`.** Sigue el scroll de la vista previa:
   - el corredor observa con un `IntersectionObserver` los elementos resaltados dentro del iframe y avisa cuáles están a la vista (mensaje `visibles`, como mucho uno por cuadro de animación y en el orden de la página);
   - la columna muestra, por cada uno, su gravedad, la descripción, qué hacer (una frase fija por regla, en español) y, si ya se corrigió, la explicación de la IA con el estado verificado;
   - los problemas de toda la página (`html`, `head`, `body`) van aparte;
   - en escritorio la columna es `sticky`.
3. **La vista previa es una ventana de navegador**, con una barra decorativa y la dirección de la página. Así se lee como «la página que estás revisando».
4. **Estado vacío útil.** Antes de auditar, la columna dice qué va a encontrar a11Lens y ofrece dos ejemplos de un clic, auditados por URL: la demo «before» del W3C y su versión «after».
5. **La autoauditoría queda en una insignia del pie** («Esta app: 0 problemas WCAG 2.2 AA»), con el dato de la última verificación. Al abrirla, se audita la app en vivo con `iframes: false` y el texto muestra el resultado real.
6. **En móvil no hay columna.** El estado vacío va debajo de «Auditar» y las recomendaciones, debajo de la vista previa.

El panel sincronizado con el scroll no estaba definido en ningún diseño anterior: esta ADR lo define.

## Consecuencias
- La columna siempre habla de la página que se está revisando, y lo que se ve en la vista previa tiene su explicación al lado.
- **No es `aria-live`:** cambiaría con cada scroll. Quien usa lector de pantalla tiene la misma información en la lista de problemas, y en la columna navegando a su `<aside>`.
- **El IntersectionObserver del iframe usa la ventana real del navegador:** si la vista previa no está en pantalla, no hay nada «a la vista» y la columna lo dice («Desplázate por la vista previa…»).
- **La insignia afirma un dato verificado:** el 0 viene de la verificación con axe de [accesibilidad.md](../accesibilidad.md), y abrirla lo confirma o lo corrige en vivo.
- **El diseño del acceso y de `/design` no cambia.**
