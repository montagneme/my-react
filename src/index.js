import React, { useState, Component } from '../react/react';

class DD extends Component {
  constructor (props) {
    super(props);
    this.state = {
      count: 1
    };
  }
  click = () => {
    console.log(33);
    this.setState({
      count: this.state.count + 1
    });
  };

  render () {
    return (
      <div>
        <div onClick={this.click}>click</div>
        {this.state.count % 2 === 0 && <span>okkkk!</span>}
      </div>
    );
  }
}
const Div = props => {
  const [key, setKey] = useState(1);
  const [value, setValue] = useState('aaa');
  const { name } = props;
  const click = () => {
    setKey(key + 1);
    setValue(value + 'c');
  };
  return (
    <div style='background-color:black;color:white;' onClick={click}>
      {name}:{key}:{value}
    </div>
  );
};
const App = () => {
  return (
    <div>
      <span style='color:black;'>
        aaa<Div name={'time'} />
        <DD />
      </span>
      <a href='http://baidu.com'>a</a>
    </div>
  );
};
React.render(<App />, document.getElementById('root'));
