import Cookies from "js-cookie";
import { useEffect, useRef, useState } from "react";
import SearchBarResults from "./SearchBarResults";
import { setUser } from "../features/appSlice";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRepeat } from "@fortawesome/free-solid-svg-icons";

const SearchBar = () => {
  const [searchFor, setSearchFor] = useState("users");
  const [show, setShow] = useState(true);
  const [roomNotFound,setRoomNotFound] = useState(false)
  const [userNotFound,setUserNotFound] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null);
  const [rooms, setRooms] = useState([]);
  const [users, setUsers] = useState([]);
  const onClickOutside = () => {
   show && setShow(false);
  };
  const ref = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event: any) => {
      //@ts-ignore
      if (ref.current && !ref.current.contains(event.target)) {
         onClickOutside();
      }
    };
    document.addEventListener("click", handleClickOutside, true);
    return () => {
      document.removeEventListener("click", handleClickOutside, true);
    };
  }, [onClickOutside]);
  const findUsers = async () => {
    const res = await fetch("http://localhost:4000/user/findUsers", {
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${Cookies.get("Auth_Token")}`,
      },

      method: "POST",
      body: JSON.stringify({
        username: inputRef.current!.value != "" && inputRef.current!.value,
      }),
    });
    const response = await res.json();
    if (!response.error) {
      setUsers(response.users);
    }
    if(response.notFound) setUserNotFound(true)
    if(!response.notFound) setUserNotFound(false)
  };
  const findRoom = async () => {
    const res = await fetch("http://localhost:4000/findRoom", {
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${Cookies.get("Auth_Token")}`,
      },

      method: "POST",
      body: JSON.stringify({
        room: inputRef.current!.value != "" && inputRef.current!.value,
      }),
    });
    const response = await res.json();
    if (!response.error) {
      setRooms(response.rooms);
    }
    if (response.notFound ) setRoomNotFound(true)
    if (!response.notFound ) setRoomNotFound(false)
  };
 
  return (
    <div onClick={()=>setShow(true)}>
      <form className="form-group d-flex">
        <input
          ref={inputRef}
          onChange={searchFor == "users" ? findUsers : findRoom}
          type="text"
          className="form-check text-white p-1 text-center"
          style={{
            outline: "none",
            background: "none",
            border: "none",
            borderBottom: "2px solid",
            borderColor: "Red",
          }}
          placeholder={`Search for ${searchFor}`}
        />
        <button
          onClick={(e) => {
            setSearchFor(searchFor == "users" ? "rooms" : "users");
            inputRef.current!.value=""
            setRoomNotFound(false)
            setUserNotFound(false)
            e.preventDefault();
          }}
          className="btn btn-danger rounded-5 ms-2"
        >
          <FontAwesomeIcon icon={faRepeat} />
        </button>
      </form>
      <div ref={ref}>
        <SearchBarResults
          show={show}
          setShow={setShow}
          userNotFound={userNotFound}
          roomNotFound={roomNotFound}
          searchFor={searchFor}
          users={users}
          rooms={rooms}
        />
      </div>
    </div>
  );
};

export default SearchBar;
