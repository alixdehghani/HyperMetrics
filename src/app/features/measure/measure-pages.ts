import { MeasureLayout } from '../../layouts/measure/measure-layout';
import { CellMeasurementComponent } from './cell-measurement/cell-measurement';
import { Measure } from './measure';
export const measureRoutes = [
    {
        path: '',
        component: MeasureLayout,
        children: [
            {
                path: '',
                component: Measure
            },
            {
                path: 'cell-measurement',
                component: CellMeasurementComponent
            }
        ]
    }
];