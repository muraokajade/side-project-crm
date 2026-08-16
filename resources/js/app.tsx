import { createRoot } from 'react-dom/client';
import AppRoot from './AppRoot';
import '../css/app.css';

createRoot(document.getElementById('app')!).render(<AppRoot />);
