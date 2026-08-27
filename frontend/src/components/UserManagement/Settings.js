import React, { useState, useEffect } from "react"
import "../../App.css"
import axios from "axios"
import { Card, Form, Input, Button } from "antd"
import LocalIP from "./../LocalIP";
import ButterToast, { Cinnamon } from "butter-toast"
import CheckCircleOutlineIcon from '@material-ui/icons/CheckCircleOutline'
import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline'
import { useHistory } from "react-router-dom"

function Settings() {

  let history = useHistory();
  useEffect(() => onReload(), []);

  const [form] = Form.useForm();
  const [form2] = Form.useForm();
  const [fname, setFname] = useState('');
  const [lname, setLname] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [nic, setNic] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');

  const onReload = () => {
    console.log("test")
    if (localStorage.getItem("loginAccess") != null) {
      localStorage.setItem("pageNumber", "6")
      const url = LocalIP + ":4000/user/getUserData";
      axios.get(url, { params: {
          user_id: localStorage.getItem("id")
        }
      }).then((response) => {
        console.log(response["data"][0])
        form.setFieldsValue({ fname: response["data"][0].fname, lname: response["data"][0].lname, email: response["data"][0].email, phone: response["data"][0].phone })
        setFname(response["data"][0].fname)
        setLname(response["data"][0].lname)
        setEmail(response["data"][0].email)
        setPhone(response["data"][0].phone)
      });
    } else {
      history.push("/");
    }
  };
  const [cpassword, setCpassword] = useState('');

  const setFnameForm = (e) => {
    setFname(e.target.value)
  }

  const setLnameForm = (e) => {
    setLname(e.target.value)
  }

  const setEmailForm = (e) => {
    setEmail(e.target.value)
  }

  const setCurrentPasswordForm = (e) => {
    setCurrentPassword(e.target.value)
  }

  const setPasswordForm = (e) => {
    setPassword(e.target.value)
  }

  const setCpasswordForm = (e) => {
    setCpassword(e.target.value)
  }

  const validation = () => {
    var Error = false;

    if (fname === "") {
      ButterToast.raise({
        content: <Cinnamon.Crisp title="Validation Error!"
          content="First Name Required!"
          scheme={Cinnamon.Crisp.SCHEME_RED}
          icon={<ErrorOutlineIcon />}
        />
      })
      Error = true;
    }

    if (lname === "") {
      ButterToast.raise({
        content: <Cinnamon.Crisp title="Validation Error!"
          content="Last Name Required!"
          scheme={Cinnamon.Crisp.SCHEME_RED}
          icon={<ErrorOutlineIcon />}
        />
      })
      Error = true;
    }

    if (email === "") {
      ButterToast.raise({
        content: <Cinnamon.Crisp title="Validation Error!"
          content="Email Required!"
          scheme={Cinnamon.Crisp.SCHEME_RED}
          icon={<ErrorOutlineIcon />}
        />
      })
      Error = true;
    }

    if (Error) {
      return false;
    }

    return true;
  };

  const SubmitForm = async (e) => {

    if (validation()) {

      const url = LocalIP + "user/accountDataChange";
      const data = JSON.stringify({
        userId: localStorage.getItem("id"),
        fname: fname,
        lname: lname,
        email: email
      });
      console.log(data);
      await axios
        .put(url, data, { headers: { "Content-Type": "application/json" } })
        .then(async (res) => {
          console.log(res.data);
          if (res.data.success === "success") {
            ButterToast.raise({
              content: <Cinnamon.Crisp title="Success!"
                content="Account Infomation Change Successful!"
                scheme={Cinnamon.Crisp.SCHEME_GREEN}
                icon={<CheckCircleOutlineIcon />}
              />
            })
            form.resetFields()
            onReload()
          } else if (res.data.err.includes("for key 'username'") || res.data.err.includes("for key 'users.username'")) {
            ButterToast.raise({
              content: <Cinnamon.Crisp title="Validation Error!"
                content="Username Is Already Exists!"
                scheme={Cinnamon.Crisp.SCHEME_RED}
                icon={<ErrorOutlineIcon />}
              />
            })
          } else if (res.data.err.includes("for key 'email'") || res.data.err.includes("for key 'users.email'")) {
            ButterToast.raise({
              content: <Cinnamon.Crisp title="Validation Error!"
                content="Email Is Already Exists!"
                scheme={Cinnamon.Crisp.SCHEME_RED}
                icon={<ErrorOutlineIcon />}
              />
            })
          }
        });

    }
  };

  const validation2 = () => {
    var Error = false;

    if (currentPassword === "") {
      ButterToast.raise({
        content: <Cinnamon.Crisp title="Validation Error!"
          content="Current Password Required!"
          scheme={Cinnamon.Crisp.SCHEME_RED}
          icon={<ErrorOutlineIcon />}
        />
      })
      Error = true;
    }

    if (password === "") {
      ButterToast.raise({
        content: <Cinnamon.Crisp title="Validation Error!"
          content="Password Required!"
          scheme={Cinnamon.Crisp.SCHEME_RED}
          icon={<ErrorOutlineIcon />}
        />
      })
      Error = true;
    }

    if (cpassword === "") {
      ButterToast.raise({
        content: <Cinnamon.Crisp title="Validation Error!"
          content="Confirm Password Required!"
          scheme={Cinnamon.Crisp.SCHEME_RED}
          icon={<ErrorOutlineIcon />}
        />
      })
      Error = true;
    }

    if (Error) {
      return false;
    }

    return true;
  };

  const SubmitForm2 = async (e) => {

    if (validation2()) {

      const url = LocalIP + "user/changePassword";
      const data = JSON.stringify({
        userId: localStorage.getItem("id"),
        password: password,
        currentPassword: currentPassword
      });
      console.log(data);
      await axios
        .put(url, data, { headers: { "Content-Type": "application/json" } })
        .then(async (res) => {
          console.log(res.data);
          if (res.data.success === "success") {
            ButterToast.raise({
              content: <Cinnamon.Crisp title="Success!"
                content="Password Change Successful!"
                scheme={Cinnamon.Crisp.SCHEME_GREEN}
                icon={<CheckCircleOutlineIcon />}
              />
            })
            form2.resetFields()
            onReload()
          } else if (res.data.err.includes("Current Password Is Incorrect")) {
            ButterToast.raise({
              content: <Cinnamon.Crisp title="Password Error!"
                content="Current Password Is Incorrect!"
                scheme={Cinnamon.Crisp.SCHEME_RED}
                icon={<ErrorOutlineIcon />}
              />
            })
          } else {
            ButterToast.raise({
              content: <Cinnamon.Crisp title="Network Error!"
                content="Connection Issue!"
                scheme={Cinnamon.Crisp.SCHEME_RED}
                icon={<ErrorOutlineIcon />}
              />
            })
          }
        });

    }
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <div><p className="dashboard-kicker">ACCOUNT MANAGEMENT</p><h1>Account Settings</h1><p>Manage your profile information and account security.</p></div>
        <div className="settings-identity"><span>{(fname || "A").charAt(0).toUpperCase()}</span><div><strong>{fname || "Account"} {lname}</strong><small>{email || "Authenticated user"}</small></div></div>
      </div>
      <div className="settings-grid">
      <Card bordered={false} className="settings-card">
        <div className="settings-card-heading"><div><span className="settings-icon">01</span><div><h2>Profile</h2><p>Personal information</p></div></div></div>
        <Form
          form={form}
          name="basic"
          initialValues={{ remember: true }}
          autoComplete="off"
          onFinish={SubmitForm}
        >
          <Form.Item
            name="fname"
            rules={[{ required: true, message: "Please Enter First Name!" }]}
            style={{ textAlign: "center" }}
          >
            <Input
              placeholder="First Name"
              value={fname}
              onChange={setFnameForm} />
          </Form.Item>

          <Form.Item
            name="lname"
            rules={[{ required: true, message: "Please Enter Last Name!" }]}
            style={{ textAlign: "center" }}
          >
            <Input
              placeholder="Last Name"
              value={lname}
              onChange={setLnameForm} />
          </Form.Item>

          <Form.Item
            name="email"
            rules={[{ required: true, message: "Please Enter Email!" }]}
            style={{ textAlign: "center" }}
            value={email}
          >
            <Input
              disabled
              name="email"
              placeholder="Email"
              value={email} />
          </Form.Item>

          <Form.Item
            name="phone"
            style={{ textAlign: "center" }}
          >
            <Input
            disabled
              placeholder="Phone"
              value={phone}/>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              className="settings-button"
            >
              Update Profile
            </Button>
          </Form.Item>
        </Form>
      </Card>
      <Card bordered={false} className="settings-card">
        <div className="settings-card-heading"><div><span className="settings-icon">02</span><div><h2>Security</h2><p>Change your password</p></div></div></div>
        <Form
          form={form2}
          name="basic"
          initialValues={{ remember: true }}
          autoComplete="off"
          onFinish={SubmitForm2}
        >
          <Form.Item
            name="currentPassword"
            rules={[
              { required: true, message: "Please input your current password!" },
              { min: 6, message: 'Password must be at least 6 characters long' }]}
          >
            <Input.Password
              placeholder="Current Password"
              value={currentPassword}
              onChange={setCurrentPasswordForm} />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: "Please input your password!" },
              { min: 6, message: 'Password must be at least 6 characters long' }]}
          >
            <Input.Password
              placeholder="Password"
              value={password}
              onChange={setPasswordForm} />
          </Form.Item>

          <Form.Item
            name="cpassword"
            dependencies={['password']}
            rules={[
              { required: true, message: "Please Enter Confirm Password!" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || value === getFieldValue('password')) {
                    return Promise.resolve();
                  }
                  return Promise.reject('Passwords do not match');
                },
              })]}
          >
            <Input.Password
              placeholder="Confirm Password"
              value={cpassword}
              onChange={setCpasswordForm} />
          </Form.Item>
          <br />
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              className="settings-button"
            >
              Update Password
            </Button>
          </Form.Item>
        </Form>
      </Card>
      </div>
    </div>
  );
}

export default Settings;