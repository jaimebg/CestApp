# Progreso: LLM on-device receipt structuring

Plan: docs/superpowers/plans/2026-07-27-llm-ondevice-receipt-structuring.md
Rama: design/llm-ondevice-structuring
Task 1: complete (commits 3246e32..b24f8da, review clean)
Minor pendientes para la revisión final:

- appleBackend.test.ts: warnSpy.mockRestore() fuera de finally (riesgo negligible)
- package-lock.json: regeneración completa, no un add mínimo. Sanity check `npm ci` antes de merge.
  Task 2: complete (commits b24f8da..6b5b179, review clean)
  Minor pendientes: falta caso items no vacíos sumando 0 contra total 0 (solo cobertura).
  Task 3: complete (commits 6b5b179..8d3e553, 2 rondas de fix, review clean)
  Cambio de diseño aprobado por el usuario: prefijo unidireccional + reparto de líneas
  en dos pasadas (exacto antes que prefijo). Spec y plan actualizados.
  Residuo aceptado conscientemente para la revisión final:
- Starvation en el mismo nivel cuando NINGÚN item tiene match exacto y ambos dependen
  de prefijo (ej. líneas '1 DET 3,45' / '2 LIQ 3,45'). Requiere líneas degeneradas de
  un solo fragmento al mismo precio. Arreglo real = matching bipartito, desproporcionado.
- lineContainsPrice sin JSDoc; Set recomputado O(n^2) (irrelevante a escala de ticket).
  Task 4: complete (commits 8d3e553..b275082, 1 ronda de fix, review clean)
  Decisión mía documentada: enum de unidades sin 'lb'/'oz' a propósito (app Spain-only).
  Fix: unitPrice = totalPrice/quantity; totalPrice<0 descarta item; quantity<=0 cae a 1.
  Minor pendiente: unitPrice sin redondear a céntimos (parser.ts:449 sí lo hace).
  Cosmético: review.tsx hace Math.round(unitPrice\*100) al guardar.
  Task 5: complete (commits b275082..8d09117, 4 rondas de fix)
  Evolución de diseño importante, spec y plan actualizados:
- Se DESCARTÓ la lista negra de palabras de resumen (incompleta + rechazaba "Base pizza fina").
- Reglas finales de auto-aplicado, sin vocabulario: (1) nunca reducir el nº de items del parser;
  (2) un solo item requiere que el parser encontrara ESE MISMO item (identidad por precio, no
  recuento). Con 2+ items la aritmética ya protege sola.
- parseLlmDate valida rollover de calendario (31/02 -> null).
- Verificado por el controlador: 118/118 tests, tsc limpio.
  Task 6: complete (commits 8d09117..06f3c87, 1 ronda de fix)
  HALLAZGO IMPORTANTE: @react-native-ai/apple hace TurboModuleRegistry.getEnforcing en el
  top level, que LANZA en Android. El import estático habría crasheado la pantalla de escaneo.
  Arreglado con resolución perezosa (Platform.OS + try/catch + memoización). Spec actualizado.
  Extra no previsto en el plan: src/services/llm/**mocks**/appleBackend.ts (manual mock de Jest,
  necesario porque el automock carga el módulo real y revienta fuera del runtime nativo).
  Verificado por el controlador: sin imports estáticos en producción, 128/128, tsc y lint OK.
  Task 7: complete (commit 436a32e, sin fixes, verificado por el controlador: 136/136, tsc OK)
  Task 8: complete (commit cd84ae1, sin fixes)
  El implementador detectó que persist usa partialize como lista blanca explícita: sin añadir
  el campo, el toggle no habría persistido nunca. Añadido.
  Verificado por el controlador: partialize OK, 2 claves i18n por locale, fila oculta si no soportado.
  Task 9: complete (commit 73561b4, sin fixes)
  Dos desviaciones correctas del plan, ambas arreglando bugs míos:
- El flag `ignored` vivía en el efecto con deps [lines, initial, onApply]; React ejecuta cleanup
  al cambiar deps, no solo al desmontar => status se quedaba en 'running' para siempre.
  Separado en unmountedRef con efecto de deps vacías.
- isColumnar ahora sale de getChainTemplate(chainId).layout.type, no hardcodeado a true.
  CONTRATO PARA TASK 10: onApply debe ser estable (useCallback) y no cerrar sobre valores
  de render obsoletos. El hook refina una vez por montaje (hasRun nunca se resetea).
  Task 10: complete (commit 10857c3, sin fixes)
  Verificado por el controlador: 8 setHasUserEdited(true) para los 8 sitios de edición del
  usuario; líneas 331 y 373 (plantilla automática) correctamente sin marcar; applyRefinement
  es useCallback estable; 7 claves i18n en ambos locales.
  Task 11: complete (commits 10857c3..576c3c8, 1 ronda de fix)
  El auto-review capturó que el modal faltaba en la lista de "cerrar modales antes de navegar"
  (guarda existente contra crash de SafeAreaProvider en Android).
  Fix del controlador: convertido a presentationStyle="pageSheet" para igualar a los otros 6
  modales; el código de mi brief lo había hecho transparent/bottom-sheet.
  Añadido resaltado de diferencias (nombre+precio) con colors.primary.
  Task 12: complete (commit 8d900de) - solo código; prebuild y checklist en dispositivo pendientes
  del propietario. El implementador amplió el corpus para registrar también los auto-aplicados
  ('llm_auto_applied'): es el único camino que acepta sin preguntar y nadie más lo observa.
  Aprobado por el controlador y reflejado en el spec.
  TODAS LAS TAREAS DE CÓDIGO COMPLETAS. Pendiente: revisión final de rama + verificación en dispositivo.
