import { Button } from "../ui/button";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function LogoutButton() {
  const { logout } = useAuth();
  const nav = useNavigate();
  const go = async() => {
    await logout();
    nav('/connexion',{replace:true});
  };
return <Button onClick={go}>Déconnexion</Button>;
}
