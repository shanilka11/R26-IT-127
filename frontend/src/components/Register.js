import React, { useEffect, useState } from "react"
import "../App.css"
import "./auth.css"
import axios from "axios"
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

function Register() {
  const history = useHistory();
  const [form] = Form.useForm();
  const [btnDisable, setBtnDisable] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("loginAccess") === "true") {
      history.push(localStorage.getItem("privilege") === "1" ? "/admin" : "/dashboard");
    }
  }, [history]);

  // antd's Form `rules` already gate onFinish, so field-by-field re-validation
  // here isn't needed — this only runs once every required rule has passed.
  const SubmitForm = async ({ fname, lname, phone, email, password }) => {
    setBtnDisable(true);
    try {
      const res = await axios.post(
        `${LocalIP}:4000/user/Register`,
        { fname, lname, phone, email, password },
        { headers: { "Content-Type": "application/json" } }
      );

      if (res.data.success === "success") {
        ButterToast.raise({
          content: (
            <Cinnamon.Crisp
              title="Success!"
              content="Registration Successful! Redirecting to login..."
              scheme={Cinnamon.Crisp.SCHEME_GREEN}
              icon={<CheckCircleOutlineIcon />}
            />
          ),
        });
        form.resetFields();
        setTimeout(() => history.push("/login"), 1200);
      } else if (res.data.err === "email_error") {
        raiseError("Email Error!", "This email already exists!");
      } else {
        raiseError("Error!", "Connection Error!");
      }
    } catch (err) {
      raiseError("Network Error!", "Could not reach the server. Please try again.");
    } finally {
      setBtnDisable(false);
    }
  };

  return (
    <div className="auth-page">
      <section className="auth-story auth-story-register" style={{ backgroundImage: `url('${process.env.PUBLIC_URL}/assets/back.jpg')` }}><p className="eyebrow">CEYLON RAILWAY · AI OPERATIONS INTELLIGENCE</p><h1>Build smarter<br />railway operations.</h1><p>Join a decision-support platform designed for demand, capacity, safety and operational intelligence.</p><div className="auth-signals"><span><b>01</b> CONNECT</span><span><b>02</b> ANALYZE</span><span><b>03</b> OPTIMIZE</span><span><b>04</b> ACT</span></div></section>
      <Card bordered={false} className="auth-card">
        <img src="/assets/Logo.png" alt="Ceylon Railway logo" className="auth-logo" />
        <p className="auth-title">Create Your Account</p>
        <p className="auth-subtitle">Join the Ceylon Railway intelligent operations platform.</p>
        <Form
          form={form}
          name="basic"
          layout="vertical"
          autoComplete="off"
          onFinish={SubmitForm}
        >
          <Form.Item
            label="First Name"
            name="fname"
            rules={[{ required: true, message: "Please enter your first name!" }]}
          >
            <Input placeholder="First Name" />
          </Form.Item>

          <Form.Item
            label="Last Name"
            name="lname"
            rules={[{ required: true, message: "Please enter your last name!" }]}
          >
            <Input placeholder="Last Name" />
          </Form.Item>

          <Form.Item
            label="Phone"
            name="phone"
            rules={[{ required: true, message: "Please enter your phone number!" }]}
          >
            <Input placeholder="Phone Number" />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: "Please enter your email!" },
              { type: "email", message: "Please enter a valid email!" },
            ]}
          >
            <Input placeholder="Email" />
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

          <Form.Item
            label="Confirm Password"
            name="cpassword"
            dependencies={["password"]}
            rules={[
              { required: true, message: "Please confirm your password!" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || value === getFieldValue("password")) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("Passwords do not match"));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Confirm Password" />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              disabled={btnDisable}
              loading={btnDisable}
              className="auth-submit-btn"
            >
              Register
            </Button>
          </Form.Item>
        </Form>
        <p className="auth-switch">Already have an account? <button type="button" onClick={() => history.push('/login')}>Sign in</button></p>
      </Card>
    </div>
  );
}

export default Register;