import DatePicker from "discourse/components/date-picker";

export default DatePicker.extend({
  _opts() {
    return {
      defaultDate:
        moment(this.defaultDate, "jYYYY-jMM-jDD").toDate() || new Date(),
      setDefaultDate: !!this.defaultDate,
      maxDate: new Date(),
    };
  },
});
