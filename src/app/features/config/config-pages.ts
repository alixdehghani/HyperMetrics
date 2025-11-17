import { ConfigLayout } from "../../layouts/config/config-layout";
import { Config } from "./config";

export const configRoutes = [
    {
        path: '',
        component: ConfigLayout,
        children: [
            {
                path: '',
                component: Config
            }
        ]
    }
];