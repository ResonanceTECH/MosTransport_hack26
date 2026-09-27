# Тестирование Frontend

## Контекст

На текущем этапе backend сервиса находится в разработке, поэтому тестирование
проводится преимущественно на уровне клиентского приложения с использованием
mock-данных и mock API (MSW).

**Не заявляется:** полноценное интеграционное тестирование всей системы
(`Frontend → Backend → ML → DB`) и нагрузочное тестирование backend API / RPS.
Эти виды будут проведены после подключения серверной части.

Демо-режим: `USE_MSW=true` + demo auth. Учётки — в [`README.md`](./README.md).

---

## Что можно тестировать сейчас

| Вид тестирования | Сейчас | Что проверяет |
|---|:---:|---|
| **Функциональное тестирование** | ✓ | Кнопки, фильтры, формы, переключатели, сценарии пользователя |
| **Component testing** | ✓ | Отдельные React-компоненты |
| **UI testing** | ✓ | Корректность отображения элементов |
| **E2E frontend с mock API** | ✓ | Полный пользовательский сценарий на моках |
| **Интеграционное frontend-тестирование** | ✓ частично | Взаимодействие компонентов между собой и с mock API |
| **RBAC / Access testing** | ✓ | Доступность элементов и маршрутов по ролям |
| **Accessibility testing** | ✓ | Клавиатура, focus, aria, доступность кнопок |
| **Responsive testing** | ✓ | Разные разрешения экрана |
| **Visual regression testing** | ✓ | Не сломался ли дизайн после изменений |
| **Error / State testing** | ✓ | loading, empty, 401, 403, 500 и т.д. через mocks |
| **Frontend performance testing** | ✓ | Lighthouse, Web Vitals, скорость рендера |
| **Stress UI testing** | ✓ | Поведение UI на большом объёме данных |
| **Настоящее API integration testing** | ✕ | Нужен backend |
| **Backend load testing / RPS** | ✕ | Нужен backend |

---

## Виды проведённого / планируемого тестирования

### Основные (приоритет для хакатона)

#### 1. Функциональное тестирование

Проверена корректность работы пользовательских элементов интерфейса:

- кнопок;
- навигации;
- фильтров;
- переключателей;
- ползунков;
- форм;
- диалоговых окон;
- элементов карты;
- элементов экспорта.

Ключевые сценарии:

| Область | Проверки |
|---|---|
| Auth | Login открывается; кнопка «Войти» реагирует на нажатие |
| Навигация | «Главная», «Аналитика», «Сценарии», «Экспорт», «Модель» открывают нужные страницы |
| Фильтры | День / Месяц / Год; выбор маршрута и остановки |
| Карта / время | временной слайдер; Play / Pause |
| Сценарии | коэффициенты двигаются; «Сбросить» возвращает значения |
| Экспорт | CSV / XLSX-кнопки реагируют корректно |
| Ошибки UI | «Назад» на 404; «Вернуться на главную» |

Это основной тип тестирования на текущем этапе.

#### 2. Component Testing

Проверена работа отдельных React-компонентов в изоляции.

**Стек:** Vitest + React Testing Library.

Кандидаты:

| Компонент | Что проверять |
|---|---|
| `FiltersPanel` / `useDashboardFilters` | горизонт, маршрут, остановка, URL-params |
| `KpiBar` | отображение KPI из props / query |
| `CoefficientsPanel` | default `1.0`, min `0.5`, max `1.5`, step, Reset → `1.0` |
| `DispatcherBottomNavigation` | активный пункт, переходы |
| `ForecastChart` / `HeatmapChart` | рендер при данных / empty |
| `QueryState` / error UI | loading, empty, error |
| `RoleGuard` | redirect на `/forbidden` без роли |
| `ExportButtons` | клик → вызов export |

Пример для `CoefficientsPanel`:

- default = `1.0`;
- min = `0.5`, max = `1.5`, step = `0.05`;
- значение отображается;
- callback вызывается после изменения;
- Reset возвращает `1.0`.

#### 3. Frontend Integration Testing

Проверено взаимодействие компонентов клиентского приложения между собой.
Взаимодействие с backend на текущем этапе эмулируется через MSW.

Корректная формулировка:

> Интеграционное тестирование клиентской части с использованием mock API.

Сценарий:

```text
пользовательское действие
→ формирование API-запроса
→ mock response (MSW)
→ обновление состояния приложения
→ изменение UI (KPI / Map / Chart)
```

Пример цепочки:

```text
Filters → mock /forecast* → KPI → Map → Chart
```

Референс моков: `src/shared/mocks/handlers.ts`, данные `tramData.ts` (маршруты **3, 7, 17**).

#### 4. E2E Testing (Playwright + MSW)

С помощью Playwright проверяются основные пользовательские сценарии приложения
на mock-данных. Backend не требуется.

Сквозной сценарий:

```text
Login
→ Главная
→ выбрать маршрут
→ День
→ выбрать дату
→ увидеть карту
→ изменить время
→ выбрать остановку
→ изменить коэффициент
→ перейти в Экспорт
→ скачать mock-файл
```

#### 5. RBAC Testing + Accessibility Testing

##### RBAC

Проверяется доступность страниц, кнопок и действий в зависимости от роли.
Роль мокается через demo auth (`demo_dispatcher` / `demo_admin`).

| Роль | Должен видеть | Не должен видеть |
|---|---|---|
| **Dispatcher** | Главная, Аналитика, Сценарии, Экспорт, Модель | Система, Grafana, Запуск пересчёта |
| **Admin** | всё выше + Система, Grafana, Запуск пересчёта | — |

Проверяется не только меню. Прямой заход:

```text
Dispatcher → /admin/system  ⇒  /forbidden
```

Ожидание совпадает с `RoleGuard` (`src/shared/guards/RoleGuard.tsx`).

##### Accessibility (кнопки и элементы)

| Проверка | Ожидание |
|---|---|
| Кнопка существует | видна в DOM / доступна по роли |
| Кликабельна | pointer / keyboard активируют действие |
| Disabled | действительно недоступна |
| Tab | можно дойти до контрола |
| Enter / Space | активируют кнопку |
| Иконки-кнопки | есть `aria-label` |
| Focus | визуально заметен |
| RBAC | кнопка скрыта / недоступна без прав |
| Overlap | не перекрыта другим элементом |
| Mobile | остаётся доступна на узком экране |

Пример тест-кейса:

```text
TC-UI-01
Элемент: «Скачать XLSX»
Роль: Dispatcher

Шаги:
1. Открыть страницу «Экспорт».
2. Перейти к кнопке через Tab.
3. Нажать Enter.

Ожидаемый результат:
Кнопка получает focus и запускает действие экспорта.
```

Дополнительно (axe / Lighthouse Accessibility):

- contrast;
- `aria-label` / alt;
- heading hierarchy;
- keyboard navigation и focus;
- связность label и input;
- доступность modal / dialog;
- корректность disabled state.

**Стек:** Playwright + `@axe-core/playwright`, Lighthouse Accessibility.

---

### Дополнительные направления

#### 6. Responsive Testing

Проверяемые разрешения:

```text
1920 × 1080
1536 × 864
1440 × 900
1366 × 768
1280 × 720
1024 × 768
768 × 1024
390 × 844
```

Критерии:

- нет horizontal scroll;
- кнопки не уходят за экран;
- нижнее меню видно;
- карточки / блоки не пересекаются;
- графики не обрезаются;
- карта сохраняет нормальный размер;
- Login / 404 / Forbidden помещаются во viewport;
- dropdown не выходит за границы экрана.

#### 7. Error State Testing

Через MSW проверяются состояния:

| Mock | Ожидаемое поведение UI |
|---|---|
| `401` | redirect → Login |
| `403` | Forbidden |
| `404` | страница / empty-state по контексту |
| `500` / `503` / `504` | сообщение об ошибке + «Повторить» |
| empty list | «Для выбранных параметров нет данных» (или аналог) |
| `meta.external_data_stale: true` | предупреждение об устаревших внешних данных |
| offline | деградация / сообщение о сети |

В MSW уже есть демо-деградация: `GET /forecast?simulate_error=503`.

#### 8. Visual Regression Testing

Screenshot baseline для ключевых страниц:

- Login;
- Dashboard;
- Analytics (`/forecast`);
- Scenarios (`/coefficients`);
- Export;
- Model;
- Forbidden;
- 404.

После изменений Playwright сравнивает новый screenshot со старым (сдвиг кнопок,
сломанный header, пропавшая нижняя навигация и т.п.).

#### 9. Frontend Performance Testing

Оценка **клиентской** производительности (не путать с нагрузкой API):

- Lighthouse;
- LCP, CLS, INP;
- размер JS bundle;
- время первой загрузки;
- скорость рендера dashboard;
- лишние re-render.

Формулировка:

> Проведено тестирование производительности клиентской части с использованием
> Lighthouse и Web Vitals.

В приложении уже есть сбор Web Vitals → `POST /telemetry`
(`src/shared/telemetry/telemetry.ts`).

#### 10. Stress UI Testing

Аналог «нагрузки» для frontend — большие объёмы **отображаемых** данных:

- много маршрутов / остановок;
- тысячи точек на карте / на графике;
- большая heatmap.

Смотрим: зависания, плавность slider, карта, память.
**Не называть** нагрузочным тестированием API.

Формулировка:

> Тестирование клиентской части на больших объёмах отображаемых данных.

---

## Инструменты

| Задача | Инструмент |
|---|---|
| Unit / Component | Vitest + React Testing Library |
| Mock API | MSW 2 (уже в проекте) |
| E2E / Visual / a11y | Playwright (+ `@axe-core/playwright`) |
| Performance | Lighthouse, Web Vitals |
| Lint / types | oxlint, `tsc` |

## Как запустить

```bash
cd Frontend
npm install
npx playwright install chromium   # один раз

npm run test          # Vitest: component + integration + RBAC unit
npm run test:e2e      # Playwright: functional + RBAC + accessibility
npm run test:all      # оба
```

Покрытие сейчас:

| Тип | Где | Статус |
|---|---|---|
| Functional | `e2e/functional.spec.ts` + unit (Login, 404, TimeSlider, Export) | ✓ |
| Component | `src/**/*.test.tsx` (LoginForm, CoefficientsPanel, ExportButtons, QueryState, TimeSlider) | ✓ |
| Frontend Integration (MSW) | `KpiBar.integration.test.tsx` | ✓ |
| E2E (Playwright + MSW) | `e2e/*.spec.ts` | ✓ |
| RBAC + Accessibility | `RoleGuard.test.tsx`, `e2e/rbac.spec.ts`, `e2e/accessibility.spec.ts` | ✓ |

Скрипты в `package.json`: `test`, `test:watch`, `test:e2e`, `test:e2e:install`, `test:all`.

---

## Что отложено до backend

- Полноценное API integration testing против реального сервиса.
- Backend load testing / RPS.
- End-to-end всей системы с ML и БД.

После подключения серверной части: те же Playwright-сценарии с
`USE_MSW=false` + contract/smoke по OpenAPI (`openapi/openapi.yaml`).
