import React, { useState } from '../react/react';

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
      </span>
      <a href='http://baidu.com'>a</a>
    </div>
  );
};
React.render(<App />, document.getElementById('root'));
