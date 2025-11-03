import { MeasureLayout } from '../../layouts/measure/measure-layout';
import { CellMeasurementComponent } from './cell-measurement/cell-measurement';
import { CellMeasurementComponentV2 } from './cell-measurementv2/cell-measurement';
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
                path: ':typeId/cell-measurement-v1',
                component: CellMeasurementComponent,
                data: {
                    "neVersion": "faraabeen_default",
                    "neTypeName": "eNodeB"
                }
            },
            {
                path: ':typeId/cell-measurement-v2',
                component: CellMeasurementComponentV2,
                data: {
                    "neVersion": "faraabeen_default",
                    "neTypeName": "eNodeB"
                }
            }
        ]
    }
];