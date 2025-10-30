// types/chart.d.ts
import 'chart.js';

declare module 'chart.js' {
  interface TooltipPositionerMap {
    cursor: TooltipPositionerFunction<keyof ChartTypeRegistry>;
  }
}