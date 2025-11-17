import { HomeLayout } from "../../layouts/home/home-layout";
import { Home } from "./home";

export const homeRoutes = [
    {
        path: '',
        component: HomeLayout,
        children: [
            {
                path: '',
                component: Home
            }
        ]
    }
];