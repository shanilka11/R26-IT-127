import React, { useState, useEffect } from "react";
import "../../App.css";
import axios from "axios";
import LocalIP from "../LocalIP";
import MaterialTable from "material-table";
import ButterToast, { Cinnamon } from "butter-toast";
import CheckCircleOutlineIcon from "@material-ui/icons/CheckCircleOutline";
import ErrorOutlineIcon from "@material-ui/icons/ErrorOutline";
import { useHistory } from "react-router-dom"

function AllUser() {
  const [user, setUser] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  let history = useHistory();

  useEffect(() => onReload(), []);

  const onReload = () => {
    console.log("new")
    const url = LocalIP+":4000/user/getUser";
    axios.get(url).then((response) => {
      console.log(response["data"])
      setUser(response["data"])
      setIsLoading(false);
    });
    if (localStorage.getItem("loginAccess")) {
      
    }else{
      history.push("/");
    }
  };

  const validation = (role, active) => {
    console.log("bb");
    var Error = false;

    if (active === "") {
      ButterToast.raise({
        content: (
          <Cinnamon.Crisp
            title="Validation Error!"
            content="Active Required!"
            scheme={Cinnamon.Crisp.SCHEME_RED}
            icon={<ErrorOutlineIcon />}
          />
        ),
      })
      Error = true;
    }

    if (Error) {
      return false;
    }

    return true;
  };

  const onDelete = (id) => {
    const url = LocalIP+"user/"
    axios.delete(url + id,{ headers: { Authorization: localStorage.getItem('token') }}).then((res) => {
      ButterToast.raise({
        content: (
          <Cinnamon.Crisp
            title="Success!"
            content="Delete Successful!"
            scheme={Cinnamon.Crisp.SCHEME_GREEN}
            icon={<CheckCircleOutlineIcon />}
          />
        ),
      });
      onReload();
    });
  };

  const SubmitForm = async (newRow, oldRow) => {
    if (validation(newRow["role"],newRow["active"])) 
    {
        const url = LocalIP +"user/"+ oldRow["id"];
        const data = JSON.stringify({
          role: newRow["role"],
          active: newRow["active"]
        });
      console.log(data);
      await axios
        .put(url, data, {
          headers: { "Content-Type": "application/json" , Authorization: localStorage.getItem('token') },
        })
        .then((res) => {
          console.log(res.data);
          onReload();
          ButterToast.raise({
            content: (
              <Cinnamon.Crisp
                title="Success!"
                content="Update Successful!"
                scheme={Cinnamon.Crisp.SCHEME_GREEN}
                icon={<CheckCircleOutlineIcon />}
              />
            ),
          });
        });
    }
  };

  const columns = [
    { title: "First Name", field: "fname", editable: 'never'},
    { title: "Last Name", field: "lname", editable: 'never'},
    { title: "Phone", field: "phone", editable: 'never'},
    { title: "NIC", field: "nic", editable: 'never'},
    { title: "Email", field: "email", editable: 'never'},
    { title: "Active", field: "active", lookup: { 1:"True", 0:"False" }},
  ];
  return (
    <div>
      <br />
      <MaterialTable
        title="User Table"
        columns={columns}
        data={user}
        style={{
          maxWidth: "80%",
          padding: "20px 5px",
          margin: "0 auto",
          fontFamily: "Arial, sans-serif",
        }}
        className="users-table"
        isLoading={isLoading}
        options={{
          filtering: true,
          sorting: true,
          serverPaging: true,
          pageSizeOptions: [5 , 10 , 20 , 50 , 100],
          actionsColumnIndex: -1,
        }}
        localization={{
          body: {
            emptyDataSourceMessage: isLoading ? 'Loading data...' : 'No records to display',
          },
        }}
        onChangePage={(page) => {
          console.log(page)
        }}
        editable={{
          onRowUpdate: (newRow, oldRow) =>
            new Promise(async (resolve, reject) => {
              SubmitForm(newRow, oldRow);
              console.log(oldRow.id);
              setTimeout(() => resolve(), 300);
            }),
          onRowDelete: (selectedRow) =>
            new Promise((resolve, reject) => {
              console.log(selectedRow);
              onDelete(selectedRow.id);
              setTimeout(() => resolve(), 300);
            }),
        }}
      />
      <br />
    </div>
  );
}

export default AllUser;
