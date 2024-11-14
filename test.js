import { CustomAttribute, registerAttribute } from "./main";

class TestingAttribute extends CustomAttribute {
  clickHandler() {
    console.log(this.value);
  }
  connectedCallback(value) {
    console.log("testing attribute connected", value);
    this.host.addEventListener("click", this.clickHandler);
  }
  changedCallback(newValue, oldValue) {
    console.log(oldValue, newValue);
  }
  disconnectedCallback() {
    console.log("testing attribute disconnected");
    this.host.removeEventListener("click", this.clickHandler);
  }
}

registerAttribute("custom-attribute", TestingAttribute);
