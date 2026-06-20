import { AlarmLayout } from "../../layouts/alarm/alarm-layout";
import { Alarm } from "./alarm";

export const AlarmRoutes = [
    {
        path: '',
        component: AlarmLayout,
        children: [
            {
                path: '',
                component: Alarm
            }
        ]
    }
];