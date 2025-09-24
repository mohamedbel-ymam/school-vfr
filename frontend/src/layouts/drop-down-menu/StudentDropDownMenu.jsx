import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from "../../components/ui/dropdown-menu.tsx";
import {Button} from "../../components/ui/button.tsx";
import {
  Cloud,
  CreditCard,
  Github,
  Keyboard,
  LifeBuoy,
  LogOut,
  Mail,
  MessageSquare,
  Plus,
  PlusCircle,
  Settings,
  User,
  UserPlus,
  Users,
} from 'lucide-react'
import {LOGIN_ROUTE} from "../../router/index.jsx";
import { useAuth } from '../../context/AuthContext.jsx';
import {useNavigate} from "react-router-dom";
import DefaultDropDownMenu from "./DefaultDropDownMenu.jsx";

export default function StudentDropDownMenu() {
  return <>

    <DefaultDropDownMenu>
    </DefaultDropDownMenu>
  </>
}