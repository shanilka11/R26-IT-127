import "./App.css";
import React, { Component } from "react";
import { BrowserRouter, Switch, Route } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import Login from "./components/Login";
import Register from "./components/Register";
import TrainData from "./components/Screens/TrainData";
import SeatAllocationDashboard from "./components/Screens/SeatAllocationDashboard";
import Adaptivedemanddashboard from "./components/Screens/Adaptivedemanddashboard";
import FraudDashboard from "./components/Screens/FraudDashboard";
import FraudBatchCheck from "./components/Screens/FraudBatchCheck";
import DemandForecast from "./components/Screens/DemandForecast";
import Settings from "./components/UserManagement/Settings";
import AllUsers from "./components/UserManagement/AllUsers";
import Admin from "./components/UserManagement/Admin";
import Dashboard from "./components/UserManagement/Dashboard";
import Nav from "./components/Nav";
import Sidebar from "./components/Sidebar";
import Footer from "./components/footer";
import Home from "./components/Home";
import ButterToast, { POS_RIGHT, POS_TOP } from "butter-toast";

class App extends Component {
  render() {
    if (localStorage.getItem("loginAccess") === "true") {
      return (
        <BrowserRouter>
          <div className="App">
            <Nav />
            <Sidebar />
            <div className="contents">
              <Switch>
                <Route path="/settings" render={() => <Settings />} />
                <Route path="/TrainData" render={() => <TrainData />} />
                <Route path="/SeatAllocationDashboard" render={() => <SeatAllocationDashboard />} />
                <Route path="/Adaptivedemanddashboard" render={() => <Adaptivedemanddashboard />} />
                <Route path="/FraudBatchCheck" render={() => <FraudBatchCheck />} />
                <Route path="/FraudDashboard" render={() => <FraudDashboard />} />
                <Route path="/DemandForecast" render={() => <DemandForecast />} />
                <Route path="/dashboard" render={() => <Dashboard />} />
                <Route path="/AllUsers" render={() => <AllUsers />} />
                <Route path="/Admin" render={() => <Admin />} />
                <Route path="/" render={() => <Dashboard />} />
              </Switch>
            </div>

            <ButterToast
              position={{ vertical: POS_TOP, horizontal: POS_RIGHT }}
            />
            <Footer />
          </div>
        </BrowserRouter>
      );
    } else {
      return (
        <BrowserRouter>
          <div className="App">
            <Nav />
            <div className="contents">
              <Switch>
                <Route path="/Register" component={Register} />
                <Route path="/login" render={() => <Login />} />
                <Route exact path="/" render={() => <Home />} />
              </Switch>
            </div>

            <ButterToast
              position={{ vertical: POS_TOP, horizontal: POS_RIGHT }}
            />
            <Footer />
          </div>
        </BrowserRouter>
      );
    }
  }
}

export default App;
