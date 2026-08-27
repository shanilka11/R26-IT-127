import React, { useEffect, useState } from "react"
import "../App.css"
import "./auth.css"
import axios from "axios"
import PmsLogo from "../assets/logo-temp.png"
import { Card, Form, Input, Button } from "antd"
import LocalIP from "./LocalIP";
import ButterToast, { Cinnamon } from "butter-toast"
import CheckCircleOutlineIcon from '@material-ui/icons/CheckCircleOutline'
import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline'
import { useHistory } from "react-router-dom"

const raiseError = (title, content) => {
  ButterToast.raise({
    content: (
      <Cinnamon.Crisp
        title={title}
        content={content}
        scheme={Cinnamon.Crisp.SCHEME_RED}
        icon={<ErrorOutlineIcon />}
      />
    ),
  });
};

function Login() {
  const history = useHistory();
  const [form] = Form.useForm();
  const [btnDisable, setBtnDisable] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("loginAccess") === "true") {
      history.push(localStorage.getItem("privilege") === "1" ? "/admin" : "/dashboard");
    }
  }, [history]);

  const SubmitForm = async ({ email, password }) => {
    setBtnDisable(true);
    try {
      const url = LocalIP + ":4000/user/login";
      await axios
        .get(url, {
          params: {
            email: email,
            password: password
          },
          headers: {
            'Content-Type': 'application/json'
          }
        })
        .then(async (res) => {
          console.log(res.data);
          setBtnDisable(false)
          if (res.data.err === "connection") {
            ButterToast.raise({
              content: <Cinnamon.Crisp title="Network Error!"
                content="Connection Issue!"
                scheme={Cinnamon.Crisp.SCHEME_RED}
                icon={<ErrorOutlineIcon />}
              />
            })
          } else if (res.data.err === "user_email") {
            ButterToast.raise({
              content: <Cinnamon.Crisp title="Validation Error!"
                content="Email Is Wrong!"
                scheme={Cinnamon.Crisp.SCHEME_RED}
                icon={<ErrorOutlineIcon />}
              />
            })
          } else if (res.data.err === "user_active") {
            ButterToast.raise({
              content: <Cinnamon.Crisp title="Activation Failed!"
                content="user not activated!"
                scheme={Cinnamon.Crisp.SCHEME_RED}
                icon={<ErrorOutlineIcon />}
              />
            })
          } else if (res.data.err === "user_password") {
            ButterToast.raise({
              content: <Cinnamon.Crisp title="Validation Error!"
                content="Password Is Wrong!"
                scheme={Cinnamon.Crisp.SCHEME_RED}
                icon={<ErrorOutlineIcon />}
              />
            })
          } else {
            const current = new Date();
            current.setDate(current.getDate() + 1);
            localStorage.setItem("fname", res.data.fname);
            localStorage.setItem("lname", res.data.lname);
            localStorage.setItem("email", res.data.email);
            localStorage.setItem("id", res.data.id);
            localStorage.setItem("token", res.data.token);
            localStorage.setItem("loginAccess", true);
            localStorage.setItem("loginDate", current.toDateString());
            ButterToast.raise({
              content: <Cinnamon.Crisp title="Success!"
                content="Login Successful!"
                scheme={Cinnamon.Crisp.SCHEME_GREEN}
                icon={<CheckCircleOutlineIcon />}
              />
            })
              history.push("/dashboard")
            window.location.reload(true)
          }
        });
    } catch (err) {
      console.log(err)
      raiseError("Network Error!", "Could not reach the server. Please try again.");
    } finally {
      setBtnDisable(false);
    }
  };

  return (
    <div className="auth-page">
      <Card bordered={false} className="auth-card">
        <img src={PmsLogo} alt="Logo" className="auth-logo" />
        <p className="auth-title">Login to your account</p>
        <Form
          name="basic"
          layout="vertical"
          form={form}
          autoComplete="off"
          onFinish={SubmitForm}
        >
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: "Please input your email!" },
              { type: "email", message: "Please enter a valid email!" },
            ]}
          >
            <Input placeholder="Email" type="email" />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[
              { required: true, message: "Please input your password!" },
              { min: 6, message: "Password must be at least 6 characters long" },
            ]}
          >
            <Input.Password placeholder="Password" />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              disabled={btnDisable}
              loading={btnDisable}
              className="auth-submit-btn"
            >
              Login
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

export default Login;